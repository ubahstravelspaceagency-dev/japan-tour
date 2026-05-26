exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = event.queryStringParameters || {};
  const reference = params.reference || params.trxref;

  if (!reference) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'No reference provided' }),
    };
  }

  try {
    // Verify payment with Paystack
    const psRes = await fetch(
      'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
      {
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    const psData = await psRes.json();

    if (!psData.status || psData.data.status !== 'success') {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Payment not verified or not successful' }),
      };
    }

    const tx = psData.data;
    const amountPaidNaira = tx.amount / 100;

    let fee = amountPaidNaira * 0.015;
    if (amountPaidNaira >= 2500) fee += 100;
    if (fee > 2000) fee = 2000;
    fee = Math.round(fee);

    const amountReceived = amountPaidNaira - fee;
    const payerEmail = tx.customer && tx.customer.email ? tx.customer.email : '';
    const firstName = tx.customer && tx.customer.first_name ? tx.customer.first_name : '';
    const lastName = tx.customer && tx.customer.last_name ? tx.customer.last_name : '';
    const payerName = (firstName + ' ' + lastName).trim() ||
      (tx.metadata && tx.metadata.custom_fields
        ? (tx.metadata.custom_fields.find(function(f){ return f.variable_name === 'name'; }) || {}).value || ''
        : '');
    const paidAt = tx.paid_at || new Date().toISOString();
    const payDate = new Date(paidAt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    // Update Supabase with payment details
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && payerEmail) {
      try {
        await fetch(
          supabaseUrl + '/rest/v1/bookings?email=eq.' + encodeURIComponent(payerEmail),
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': 'Bearer ' + supabaseKey,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              payment_reference: reference,
              amount_paid: '\u20A6' + amountPaidNaira.toLocaleString('en-NG'),
              amount_received: '\u20A6' + amountReceived.toLocaleString('en-NG'),
              paystack_fee: '\u20A6' + fee.toLocaleString('en-NG'),
              payment_date: payDate,
              payment_status: 'PAID',
            }),
          }
        );
      } catch(e) {
        console.error('Supabase update failed:', e.message);
      }
    }

    // Send email via EmailJS
    const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
    const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
    const emailjsUserId = process.env.EMAILJS_USER_ID;

    if (emailjsServiceId && emailjsTemplateId && emailjsUserId) {
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: emailjsServiceId,
            template_id: emailjsTemplateId,
            user_id: emailjsUserId,
            template_params: {
              payer_name: payerName || 'Unknown',
              payer_email: payerEmail,
              amount_paid: '\u20A6' + amountPaidNaira.toLocaleString('en-NG'),
              amount_received: '\u20A6' + amountReceived.toLocaleString('en-NG'),
              paystack_fee: '\u20A6' + fee.toLocaleString('en-NG'),
              reference: reference,
              pay_date: payDate,
              tour: 'Japan Group Tour \u2014 October 2026',
            }
          })
        });
      } catch(e) {
        console.error('EmailJS failed:', e.message);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: 'success',
        reference: reference,
        amountPaid: amountPaidNaira,
        paystackFee: fee,
        amountReceived: amountReceived,
        payerName: payerName,
        payerEmail: payerEmail,
        paidAt: paidAt,
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Server error: ' + err.message }),
    };
  }
};

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
    // ── 1. VERIFY PAYMENT WITH PAYSTACK ──
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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

    // Calculate Paystack fee: 1.5% + ₦100 (if >₦2,500), capped at ₦2,000
    let fee = amountPaidNaira * 0.015;
    if (amountPaidNaira >= 2500) fee += 100;
    if (fee > 2000) fee = 2000;
    fee = Math.round(fee);

    const amountReceived = amountPaidNaira - fee;
    const payerEmail     = tx.customer?.email || '';
    const payerName      = tx.customer?.first_name
      ? (tx.customer.first_name + ' ' + tx.customer.last_name).trim()
      : (tx.metadata?.custom_fields?.find(f => f.variable_name === 'name')?.value || '');
    const paidAt         = tx.paid_at || new Date().toISOString();
    const payDate        = new Date(paidAt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    // ── 2. UPDATE GOOGLE SHEET VIA SHEETDB ──
    const sheetdbUrl = process.env.SHEETDB_URL;
    if (sheetdbUrl) {
      try {
        // Find row by email or name and update payment columns
        await fetch(`${sheetdbUrl}/email/${encodeURIComponent(payerEmail)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              payment_reference: reference,
              amount_paid:       `₦${amountPaidNaira.toLocaleString('en-NG')}`,
              amount_received:   `₦${amountReceived.toLocaleString('en-NG')}`,
              paystack_fee:      `₦${fee.toLocaleString('en-NG')}`,
              payment_date:      payDate,
              payment_status:    'PAID',
            }
          })
        });
      } catch (sheetErr) {
        console.error('SheetDB update failed:', sheetErr.message);
        // Non-fatal — still return success to customer
      }
    }

    // ── 3. SEND EMAIL TO AGENCY VIA EMAILJS ──
    const emailjsServiceId  = process.env.EMAILJS_SERVICE_ID;
    const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
    const emailjsUserId     = process.env.EMAILJS_USER_ID;

    if (emailjsServiceId && emailjsTemplateId && emailjsUserId) {
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id:  emailjsServiceId,
            template_id: emailjsTemplateId,
            user_id:     emailjsUserId,
            template_params: {
              payer_name:      payerName || 'Unknown',
              payer_email:     payerEmail,
              amount_paid:     `₦${amountPaidNaira.toLocaleString('en-NG')}`,
              amount_received: `₦${amountReceived.toLocaleString('en-NG')}`,
              paystack_fee:    `₦${fee.toLocaleString('en-NG')}`,
              reference:       reference,
              pay_date:        payDate,
              tour:            'Japan Group Tour — October 2026',
            }
          })
        });
      } catch (emailErr) {
        console.error('EmailJS failed:', emailErr.message);
        // Non-fatal — still return success to customer
      }
    }

    // ── 4. RETURN DATA TO RECEIPT PAGE ──
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status:          'success',
        reference,
        amountPaid:      amountPaidNaira,
        paystackFee:     fee,
        amountReceived,
        payerName,
        payerEmail,
        paidAt,
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

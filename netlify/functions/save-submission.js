exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sheetdbUrl = process.env.SHEETDB_URL;
  if (!sheetdbUrl) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'SheetDB URL not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const row = {
      submitted_at:              new Date().toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }),
      first_name:                body.first_name || '',
      last_name:                 body.last_name  || '',
      full_name:                 `${body.first_name || ''} ${body.last_name || ''}`.trim(),
      email:                     body.email       || '',
      whatsapp:                  body.whatsapp    || '',
      state:                     body.state       || '',
      dob:                       body.dob         || '',
      gender:                    body.gender      || '',
      has_passport:              body.has_passport || '',
      passport_number:           body.passport_number  || '',
      passport_expiry:           body.passport_expiry  || '',
      passport_fullname:         body.passport_fullname || '',
      travelled_before:          body.travelled_before  || '',
      visa_denied:               body.visa_denied       || '',
      room_type:                 body.room_type         || '',
      group_size:                body.group_size        || '',
      companion_1:               body.companion_1       || '',
      companion_2:               body.companion_2       || '',
      companion_3:               body.companion_3       || '',
      deposit_readiness:         body.deposit_readiness || '',
      payment_plan:              body.payment_plan      || '',
      medical:                   body.medical           || '',
      medical_details:           body.medical_details   || '',
      dietary:                   body.dietary           || '',
      dietary_details:           body.dietary_details   || '',
      special_requirements:      body.special_requirements || '',
      emergency_name:            body.emergency_name        || '',
      emergency_relationship:    body.emergency_relationship || '',
      emergency_phone:           body.emergency_phone        || '',
      referral_source:           body.referral_source        || '',
      referral_source_other:     body.referral_source_other  || '',
      // Payment columns — empty until they pay
      payment_status:            'NO PAYMENT YET',
      payment_reference:         '',
      amount_paid:               '',
      amount_received:           '',
      paystack_fee:              '',
      payment_date:              '',
    };

    console.log('Saving to SheetDB:', sheetdbUrl);
    console.log('Row data:', JSON.stringify(row));
    const sheetRes = await fetch(sheetdbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: row }),
    });

    if (!sheetRes.ok) {
      const errText = await sheetRes.text();
      throw new Error('SheetDB error: ' + errText);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ duplicate: false }),
    };
  }

  const params   = event.queryStringParameters || {};
  const email    = (params.email    || '').toLowerCase().trim();
  const name     = (params.name     || '').toLowerCase().trim();
  const passport = (params.passport || '').toLowerCase().trim();

  try {
    // Check email
    if (email) {
      const res  = await fetch(
        supabaseUrl + '/rest/v1/bookings?email=eq.' + encodeURIComponent(email) + '&select=email&limit=1',
        { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ duplicate: true, field: 'email' }),
        };
      }
    }

    // Check full name
    if (name) {
      const res  = await fetch(
        supabaseUrl + '/rest/v1/bookings?full_name=ilike.' + encodeURIComponent(name) + '&select=full_name&limit=1',
        { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ duplicate: true, field: 'name' }),
        };
      }
    }

    // Check passport
    if (passport) {
      const res  = await fetch(
        supabaseUrl + '/rest/v1/bookings?passport_number=ilike.' + encodeURIComponent(passport) + '&select=passport_number&limit=1',
        { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ duplicate: true, field: 'passport' }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ duplicate: false }),
    };

  } catch(err) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ duplicate: false }),
    };
  }
};

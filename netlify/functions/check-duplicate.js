exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sheetdbUrl = process.env.SHEETDB_URL;
  if (!sheetdbUrl) {
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
    const res  = await fetch(sheetdbUrl);
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ duplicate: false }),
      };
    }

    if (email) {
      const emailMatch = rows.find(r => (r.email || '').toLowerCase().trim() === email);
      if (emailMatch) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ duplicate: true, field: 'email' }),
        };
      }
    }

    if (name) {
      const nameMatch = rows.find(r => (r.full_name || '').toLowerCase().trim() === name);
      if (nameMatch) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ duplicate: true, field: 'name' }),
        };
      }
    }

    if (passport) {
      const passportMatch = rows.find(r => (r.passport_number || '').toLowerCase().trim() === passport);
      if (passportMatch) {
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

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ duplicate: false }),
    };
  }
};

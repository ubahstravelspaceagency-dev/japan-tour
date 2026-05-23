exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const siteId = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_ACCESS_TOKEN;

  // If credentials not set, allow submission
  if (!siteId || !token) {
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
    // Get all form submissions from Netlify
    const res   = await fetch(
      'https://api.netlify.com/api/v1/sites/' + siteId + '/forms',
      { headers: { Authorization: 'Bearer ' + token } }
    );
    const forms = await res.json();
    const form  = Array.isArray(forms) && forms.find(function(f) { return f.name === 'japan-tour-booking'; });

    if (!form) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ duplicate: false }),
      };
    }

    const subRes      = await fetch(
      'https://api.netlify.com/api/v1/forms/' + form.id + '/submissions?per_page=500',
      { headers: { Authorization: 'Bearer ' + token } }
    );
    const submissions = await subRes.json();

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ duplicate: false }),
      };
    }

    const rows = submissions.map(function(s) { return s.data || {}; });

    // Check email
    if (email) {
      const match = rows.find(function(r) { return (r.email || '').toLowerCase().trim() === email; });
      if (match) return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ duplicate: true, field: 'email' }),
      };
    }

    // Check full name
    if (name) {
      const match = rows.find(function(r) { return (r.full_name || '').toLowerCase().trim() === name; });
      if (match) return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ duplicate: true, field: 'name' }),
      };
    }

    // Check passport
    if (passport) {
      const match = rows.find(function(r) { return (r.passport_number || '').toLowerCase().trim() === passport; });
      if (match) return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ duplicate: true, field: 'passport' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ duplicate: false }),
    };

  } catch(err) {
    // If check fails, allow submission
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ duplicate: false }),
    };
  }
};

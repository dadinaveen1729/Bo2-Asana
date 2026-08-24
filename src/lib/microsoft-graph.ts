const AUTHORITY = 'https://login.microsoftonline.com';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function getAppOnlyToken() {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft 365 sync is not configured (missing MS_TENANT_ID/MS_CLIENT_ID/MS_CLIENT_SECRET).');
  }

  const res = await fetch(`${AUTHORITY}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Microsoft token request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

export interface GraphPhoto {
  bytes: Buffer;
  contentType: string;
}

/** Returns null if the user has no photo set (or isn't found), not an error. */
export async function fetchUserPhoto(userPrincipalNameOrEmail: string): Promise<GraphPhoto | null> {
  const token = await getAppOnlyToken();
  const res = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(userPrincipalNameOrEmail)}/photo/$value`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Microsoft Graph photo request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await res.arrayBuffer();
  return { bytes: Buffer.from(arrayBuffer), contentType };
}

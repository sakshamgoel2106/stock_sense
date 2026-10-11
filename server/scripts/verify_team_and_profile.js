const API = 'http://localhost:5000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function testTeamAndProfile() {
  console.log('--- TESTING PROFILE, SETTINGS & TEAM REMOVAL GOVERNANCE ---');

  // 1. Login as Admin
  const adminLogin = await req(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@stocksense.com', password: 'Password123!' })
  });
  const adminToken = adminLogin.token;
  const adminHeaders = { 
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}` 
  };
  console.log('✔ Admin logged in:', adminLogin.name);

  // 2. Test Profile Update
  const updateProfileRes = await req(`${API}/auth/profile`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ name: 'Rajesh Sharma (Admin)' })
  });
  console.log('✔ Profile updated successfully:', updateProfileRes.name);

  // 3. Test Company Settings Update (GSTIN, Address, etc.)
  const settingsRes = await req(`${API}/companies/current`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      gstin: '27AABCS1429B1Z1',
      address: 'Bhiwandi Logistics Hub, Building 4',
      city: 'Thane / Mumbai',
      state: 'Maharashtra',
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        requireTransferApproval: true,
        lowStockThreshold: 12
      }
    })
  });
  console.log('✔ Company settings updated successfully:', settingsRes.company.gstin, settingsRes.company.settings.currency);

  // 4. Test Direct Team Member Provisioning
  const tempEmail = `testworker_${Date.now()}@stocksense.in`;
  const directMemberRes = await req(`${API}/companies/members/direct`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Sunil Verma',
      email: tempEmail,
      role: 'WORKER',
      password: 'Password123!'
    })
  });
  const createdMemberId = directMemberRes.membership._id;
  console.log('✔ Direct team member created:', directMemberRes.membership.userId.name, createdMemberId);

  // 5. Login as Manager
  const managerLogin = await req(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@stocksense.com', password: 'Password123!' })
  });
  const managerToken = managerLogin.token;
  const managerHeaders = { 
    'Content-Type': 'application/json',
    Authorization: `Bearer ${managerToken}` 
  };
  console.log('✔ Manager logged in:', managerLogin.name);

  // 6. Manager Requests Removal of the newly added worker
  const requestRemovalRes = await req(`${API}/companies/members/${createdMemberId}/request-removal`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ reason: 'Probation period ended without extension' })
  });
  console.log('✔ Manager submitted removal request. Status:', requestRemovalRes.membership.status);

  // 7. Verify Manager CANNOT approve the removal directly (RBAC guardrail!)
  try {
    await req(`${API}/companies/members/${createdMemberId}/approve-removal`, {
      method: 'POST',
      headers: managerHeaders
    });
    throw new Error('FAILED: Manager was able to approve removal!');
  } catch (err) {
    if (err.status === 403) {
      console.log('✔ RBAC Enforced: Manager blocked from approving removal (HTTP 403 Forbidden)!');
    } else {
      throw err;
    }
  }

  // 8. Company Admin reviews and APPROVES removal
  const approveRes = await req(`${API}/companies/members/${createdMemberId}/approve-removal`, {
    method: 'POST',
    headers: adminHeaders
  });
  console.log('✔ Company Admin approved removal:', approveRes.message);

  // Restore admin name
  await req(`${API}/auth/profile`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ name: 'Rajesh Sharma' })
  });

  console.log('\n--- ALL PROFILE, SETTINGS & TEAM GOVERNANCE TESTS PASSED! ---');
}

testTeamAndProfile().catch(err => {
  console.error('Test error:', err.data || err.message);
  process.exit(1);
});

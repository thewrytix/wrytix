document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const icon = document.getElementById('togglePassword');
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    const avatar = document.getElementById('avatar').files[0];
    const documentFile = document.getElementById('document').files[0];

    if (!fullName || !username || !email || !password || !role || !documentFile) {
        showError('Please fill all required fields, including document.');
        return;
    }

    if (!isUsernameAvailable) {
        showError('Username is not available.');
        return;
    }

    if (!isEmailAvailable) {
        showError('Email is not available.');
        return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('role', role);
    formData.append('submittedBy', sessionStorage.getItem('currentUser') || 'anonymous');
    if (avatar) formData.append('avatar', avatar);
    formData.append('pdf', documentFile);

    try {
        const endpoint = '/pendingUsers';

        const res = await fetch(`https://wrytix.onrender.com${endpoint}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        let resData;
        try {
            resData = await res.json();
        } catch (err) {
            console.error('Failed to parse JSON:', await res.text());
            throw new Error('Invalid server response');
        }

        if (!res.ok) {
            console.error(`❌ Add user failed. Status: ${res.status}`, resData);
            const msg = resData?.message || resData?.error || 'Unknown error';
            showError(`Failed to submit user. (${res.status}) ${msg}`);
            return;
        }

        showSuccess('Author submitted for admin approval.');
        document.getElementById('addUserForm').reset();
        isUsernameAvailable = false;
        isEmailAvailable = false;
        usernameStatus.textContent = '';
        emailStatus.textContent = '';

        console.log('✅ User submitted');
    } catch (err) {
        console.error('❌ Unexpected Add User error:', err);
        showError(`Unexpected error while submitting user: ${err.message}`);
    }
});

const usernameInput = document.getElementById('username');
const usernameStatus = document.getElementById('username-status');
const emailInput = document.getElementById('email');
const emailStatus = document.getElementById('email-status');
let usernameTimer;
let emailTimer;
let isUsernameAvailable = false;
let isEmailAvailable = false;

usernameInput.addEventListener('input', () => {
    clearTimeout(usernameTimer);
    const username = usernameInput.value.trim();

    if (username.length < 3) {
        usernameStatus.textContent = 'Username too short';
        usernameStatus.style.color = 'gray';
        isUsernameAvailable = false;
        return;
    }

    usernameStatus.textContent = 'Checking...';
    usernameStatus.style.color = 'gray';

    usernameTimer = setTimeout(async () => {
        try {
            const res = await fetch(`https://wrytix.onrender.com/check-username?username=${encodeURIComponent(username)}`);
            const { available } = await res.json();
            isUsernameAvailable = available;
            usernameStatus.textContent = available ? 'Username available ✅' : 'Username already taken ❌';
            usernameStatus.style.color = available ? 'green' : 'red';
        } catch (err) {
            usernameStatus.textContent = 'Error checking username';
            usernameStatus.style.color = 'gray';
            isUsernameAvailable = false;
        }
    }, 600);
});

emailInput.addEventListener('input', () => {
    clearTimeout(emailTimer);
    const email = emailInput.value.trim();

    if (!email.includes('@') || email.length < 5) {
        emailStatus.textContent = 'Enter a valid email.';
        emailStatus.style.color = 'gray';
        isEmailAvailable = false;
        return;
    }

    emailStatus.textContent = 'Checking...';
    emailStatus.style.color = 'gray';

    emailTimer = setTimeout(async () => {
        try {
            const res = await fetch(`https://wrytix.onrender.com/check-email?email=${encodeURIComponent(email)}`);
            const { available } = await res.json();
            isEmailAvailable = available;
            emailStatus.textContent = available ? 'Email available ✅' : 'Email already used ❌';
            emailStatus.style.color = available ? 'green' : 'red';
        } catch (err) {
            emailStatus.textContent = 'Error checking email';
            emailStatus.style.color = 'gray';
            isEmailAvailable = false;
        }
    }, 600);
});
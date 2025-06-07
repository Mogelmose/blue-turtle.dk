const adgangskoder = {
  "Andreas": "1234",
  "Mads": "abcd",
  "Oliver": "kode123"
};

function showLogin(name) {
  document.querySelector('.profiles').style.display = 'none';
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('bruger').value = name;

  // Rens tidligere fejlbeskeder og kodefelt
  document.getElementById('fejlbesked').textContent = '';
  document.getElementById('kode').value = '';
}

function goBack() {
  document.getElementById('loginForm').classList.add('hidden');
  document.querySelector('.profiles').style.display = 'flex';

  // Rens formularen ved tilbage
  document.getElementById('fejlbesked').textContent = '';
  document.getElementById('kode').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const bruger = document.getElementById('bruger').value;
    const kode = document.getElementById('kode').value;
    const fejlbesked = document.getElementById('fejlbesked');

    if (adgangskoder[bruger] === kode) {
      window.location.href = "forside.html";
    } else {
      fejlbesked.textContent = "Forkert adgangskode";
      document.getElementById('kode').value = ''; // Nulstil kodefelt
    }
  });
});


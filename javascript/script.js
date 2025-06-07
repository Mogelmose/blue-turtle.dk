const adgangskoder = {
  "Andreas": "1234",
  "Mads": "abcd",
  "Oliver": "kode123"
};

function showLogin(name) {
  document.querySelector('.profiles').style.display = 'none';
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('bruger').value = name;
}

function goBack() {
  document.getElementById('loginForm').classList.add('hidden');
  document.querySelector('.profiles').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const bruger = document.getElementById('bruger').value;
    const kode = document.getElementById('kode').value;

    if (adgangskoder[bruger] === kode) {
      window.location.href = "forside.html";
    } else {
      alert("Forkert adgangskode. Prøv igen.");
    }
  });
});

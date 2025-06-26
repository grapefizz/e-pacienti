 function checkLogin() {
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;

  // Simple hardcoded check
  if (user === 'stardent' && pass === 'Stardent2006') {
    document.getElementById('loginOverlay').style.display = 'none';
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function resetTreatmentForm() {
  document.getElementById('selectedTreatmentId').value = '';
  document.getElementById('treatDate').value = getToday();
  document.getElementById('toothNo').value = '';
  document.getElementById('description').value = '';
  document.getElementById('labSelect').value = '';
  document.getElementById('labCustom').value = '';
  document.getElementById('labCustom').style.display = 'none';
  document.getElementById('debit').value = '';
  document.getElementById('credit').value = '';
  document.getElementById('treatedBy').value = '0';

  document.getElementById('addTreatmentBtn').style.display = 'inline-block';
  document.getElementById('updateTreatmentBtn').style.display = 'none';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('deleteTreatmentBtn').style.display = 'none';

  if (selectedTreatmentRow) {
    selectedTreatmentRow.classList.remove('selected-row');
    selectedTreatmentRow = null;
  }
}

function resetPatientForm() {
  selectedPatientId = null;
  ['name','tel','dob','address','personal_number','medical_alert'].forEach(id => {
    document.getElementById(id).value = '';
  });

  document.getElementById('addPatientBtn').style.display = 'inline-block';
  document.getElementById('updatePatientBtn').style.display = 'none';
  document.getElementById('deletePatientBtn').style.display = 'none';
  document.getElementById('cancelPatientBtn').style.display = 'none';

  document.getElementById('treatmentTable').querySelector('tbody').innerHTML = '';
  document.getElementById('balance').textContent = '0';
}

function handleLabChange() {
  const select = document.getElementById('labSelect');
  const custom = document.getElementById('labCustom');
  if (select.value === "Other") {
    custom.style.display = 'block';
  } else {
    custom.style.display = 'none';
    custom.value = '';
  }
}



 
 let selectedPatientId = null;
 let selectedTreatmentRow = null;


    document.getElementById('search').addEventListener('input', loadPatients);

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date)) return dateStr;
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    function getToday() {
      const today = new Date();
      return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;
    }

    async function loadPatients() {
      const res = await fetch('/patients');
      const patients = await res.json();
      const query = document.getElementById('search').value.toLowerCase();
      const list = document.getElementById('patientList');
      list.innerHTML = '';
      patients
        .filter(p => p.name.toLowerCase().includes(query))
        .forEach(p => {
          const div = document.createElement('div');
          div.className = 'patientItem';
          div.textContent = p.name;
          div.onclick = () => loadPatientInfo(p.id);
          list.appendChild(div);
        });
    }

    async function addPatient() {
      const data = {
        name: document.getElementById('name').value,
        tel: document.getElementById('tel').value,
        dob: document.getElementById('dob').value,
        address: document.getElementById('address').value,
        personal_number: document.getElementById('personal_number').value,
        medical_alert: document.getElementById('medical_alert').value
      };
      const pn = data.personal_number.trim();
if (pn && (pn.length !== 10 || !/^\d{10}$/.test(pn))) {
  return alert("Personal number must be exactly 10 digits.");
}

      if (!data.name.trim()) return alert("Name is required to add a patient.");
      const res = await fetch('/add_patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      alert(result.status);
      loadPatients();
    }

    function loadPatientInfo(id) {
      selectedPatientId = id;

      fetch(`/patient/${id}`)
        .then(res => res.json())
        .then(p => {
          document.getElementById('name').value = p.Name || '';
          document.getElementById('tel').value = p.Tel || '';
          document.getElementById('dob').value = formatDate(p.BirthDate || '');
          document.getElementById('address').value = p.Address || '';
          document.getElementById('personal_number').value = p.personal_number || '';
          document.getElementById('medical_alert').value = p.MedicalAlert || '';
          loadTreatments(id);

          document.getElementById('addPatientBtn').style.display = 'none';
          document.getElementById('updatePatientBtn').style.display = 'inline-block';
          document.getElementById('deletePatientBtn').style.display = 'inline-block';
          document.getElementById('cancelPatientBtn').style.display = 'inline-block';
        });
        loadPatientPhotos(id);
    }


    async function updatePatient() {
      if (!selectedPatientId) return;
      const data = {
        name: document.getElementById('name').value,
        tel: document.getElementById('tel').value,
        dob: document.getElementById('dob').value,
        address: document.getElementById('address').value,
        personal_number: document.getElementById('personal_number').value,
        medical_alert: document.getElementById('medical_alert').value
      };

      const pn = data.personal_number.trim();
if (pn && (pn.length !== 10 || !/^\d{10}$/.test(pn))) {
  return alert("Personal number must be exactly 10 digits.");
}

      const res = await fetch(`/update_patient/${selectedPatientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      alert(result.status);
      loadPatients();
    }

    async function deletePatient() {
      if (!selectedPatientId) return;
      if (!confirm("Are you sure you want to delete this patient and their treatments?")) return;
      const res = await fetch(`/delete_patient/${selectedPatientId}`, { method: 'DELETE' });
      const result = await res.json();
      alert(result.status);
      selectedPatientId = null;
      clearForm();
      loadPatients();
      document.querySelector('#treatmentTable tbody').innerHTML = '';
      document.getElementById('balance').textContent = '0';
    }

    async function deleteSelectedTreatment() {
      const treatmentId = document.getElementById('selectedTreatmentId').value;
      if (!treatmentId) return alert("No treatment selected.");

      const confirmDelete = confirm("Are you sure you want to delete this treatment?");
      if (!confirmDelete) return;

      const res = await fetch(`/delete_treatment/${treatmentId}`, {
        method: 'DELETE'
      });

      const result = await res.json();
      alert(result.status || result.error);
      resetTreatmentForm();
      loadTreatments(selectedPatientId);
    }


    function clearForm() {
      ['name','tel','dob','address','personal_number','medical_alert'].forEach(id => {
        document.getElementById(id).value = '';
      });
    }

async function loadTreatments(id) {
  const res = await fetch(`/treatments/${id}`);
  const treatments = await res.json();
  const tbody = document.querySelector('#treatmentTable tbody');
  tbody.innerHTML = '';
  let balance = 0;

  treatments.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(t.date)}</td>
      <td>${t.tooth || ''}</td>
      <td>${t.description || ''}</td>
      <td>${t.lab || ''}</td>
      <td>${t.debit || 0}</td>
      <td>${t.credit || 0}</td>
      <td>${t.treater_name || ''}</td>
    `;
    tbody.appendChild(tr);
    balance += (parseFloat(t.debit) * (-1) || 0) - (parseFloat(t.credit) * (-1) || 0);

      tr.onclick = () => {
  if (selectedTreatmentRow) selectedTreatmentRow.classList.remove('selected-row');
  selectedTreatmentRow = tr;
  tr.classList.add('selected-row');

  document.getElementById('selectedTreatmentId').value = t.id;
  document.getElementById('treatDate').value = formatDate(t.date || '');
  document.getElementById('toothNo').value = t.tooth || '';
  document.getElementById('description').value = t.description || '';
  const labSelect = document.getElementById('labSelect');
const labCustom = document.getElementById('labCustom');
const knownLabs = Array.from(labSelect.options).map(opt => opt.value);

if (knownLabs.includes(t.lab)) {
  labSelect.value = t.lab;
  labCustom.value = '';
  labCustom.style.display = 'none';
} else {
  labSelect.value = 'Other';
  labCustom.value = t.lab;
  labCustom.style.display = 'block';
}
  document.getElementById('debit').value = t.debit || '';
  document.getElementById('credit').value = t.credit || '';
  document.getElementById('treatedBy').value = t.treater || '0';

  document.getElementById('addTreatmentBtn').style.display = 'none';
  document.getElementById('updateTreatmentBtn').style.display = 'inline-block';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  document.getElementById('deleteTreatmentBtn').style.display = 'inline-block';
};


  });
  document.getElementById('balance').textContent = balance.toFixed(2);
}


async function updateTreatment() {
  const treatmentId = document.getElementById('selectedTreatmentId').value;
  if (!treatmentId) return;

  const data = {
    patient_id: selectedPatientId,
    date: document.getElementById('treatDate').value,
    tooth_no: document.getElementById('toothNo').value,
    description: document.getElementById('description').value,
    lab: document.getElementById('labSelect').value === 'Other'
      ? document.getElementById('labCustom').value
      : document.getElementById('labSelect').value,
    debit: parseFloat(document.getElementById('debit').value) || 0,
    credit: parseFloat(document.getElementById('credit').value) || 0,
    treated_by: parseInt(document.getElementById('treatedBy').value) || 0
  };

  const res = await fetch(`/update_treatment/${treatmentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  alert(result.status || result.error);
  loadTreatments(selectedPatientId);
  resetTreatmentForm();
}


    async function addTreatment() {
      if (!selectedPatientId) return alert("Select a patient.");
      const data = {
        date: document.getElementById('treatDate').value,
        tooth: document.getElementById('toothNo').value,
        description: document.getElementById('description').value,
        lab: document.getElementById('labSelect').value === 'Other'
      ? document.getElementById('labCustom').value
      : document.getElementById('labSelect').value,
        debit: parseFloat(document.getElementById('debit').value) || 0,
        credit: parseFloat(document.getElementById('credit').value) || 0,
        treated_by: parseInt(document.getElementById('treatedBy').value) || 0
      };
      if (!data.date || !data.description) return alert("Date and description are required.");
      const res = await fetch(`/add_treatment/${selectedPatientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.status);
        loadTreatments(selectedPatientId);
      } else {
        alert("Error: " + (result.error || "Unknown"));
      }
    }

    async function deleteTreatment(id) {
      if (!confirm("Delete this treatment?")) return;
      const res = await fetch(`/delete_treatment/${id}`, { method: 'DELETE' });
      const result = await res.json();
      alert(result.status);
      loadTreatments(selectedPatientId);
    }

    async function loadTreaters() {
      const res = await fetch('/treaters');
      const treaters = await res.json();
      const select = document.getElementById('treatedBy');
      select.innerHTML = '';

      // Add the default option manually
      const defaultOption = document.createElement('option');
      defaultOption.value = '0';
      defaultOption.textContent = '';
      select.appendChild(defaultOption);

      // Append all treaters (excluding ID 0 if already added manually)
      treaters.forEach(t => {
        // Avoid adding a duplicate default
        if (t.id !== 0) {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = `${t.id}: ${t.name}`;
          select.appendChild(opt);
        }
      });

      // Explicitly set default selected value
      select.value = '0';
    }

async function loadPatientPhotos(patientId) {
  const res = await fetch(`/patient_photos/${patientId}`);
  if (!res.ok) return;

  const photos = await res.json();
  const container = document.getElementById("photoPreviewContainer");
  container.innerHTML = "";

  photos.forEach(photo => {
    const img = document.createElement("img");
    img.src = `/photos/${photo.filename}`;
    img.classList.add("photo-thumb");
    container.appendChild(img);
  });
}

async function uploadPhoto() {
  if (!selectedPatientId) return alert("Select a patient first.");
  const input = document.getElementById('photoInput');
  if (!input.files.length) return alert("Choose a photo to upload.");

  const formData = new FormData();
  formData.append('photo', input.files[0]);

  const res = await fetch(`/upload_photo/${selectedPatientId}`, {
    method: 'POST',
    body: formData
  });
  const result = await res.json();
  alert(result.status || result.error);
  input.value = '';
  loadPhotos();
}

async function loadPhotos() {
  const res = await fetch(`/photos/${selectedPatientId}`);
  const photos = await res.json();
  const gallery = document.getElementById('photoGallery');
  gallery.innerHTML = '';
  photos.forEach(photo => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100px';
    wrapper.style.height = '100px';

    const img = document.createElement('img');
    img.src = `/photos/${photo.filename}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';
    img.style.cursor = 'pointer';
    img.onclick = () => enlargePhoto(img.src);

    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.style.position = 'absolute';
    btn.style.top = '-6px';
    btn.style.right = '-6px';
    btn.style.width = '20px';
    btn.style.height = '20px';
    btn.style.borderRadius = '50%';
    btn.style.border = 'none';
    btn.style.background = 'red';
    btn.style.color = 'white';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm("Delete this photo?")) {
        await fetch(`/delete_photo/${photo.photo_id}`, { method: 'DELETE' });
        loadPhotos();
      }
    };

    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    gallery.appendChild(wrapper);
  });
}

let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

const zoomedImg = document.getElementById('zoomedImg');

function updateTransform() {
  zoomedImg.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
}

function resetZoom() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  updateTransform();
}

function enlargePhoto(src) {
  const modal = document.getElementById('photoModal');
  zoomedImg.src = src;
  resetZoom();
  modal.style.display = 'flex';
}

function closePhotoModal(e) {
  if (e.target.id === 'photoModal') {
    document.getElementById('photoModal').style.display = 'none';
  }
}

zoomedImg.addEventListener('wheel', function (e) {
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  scale += delta * -0.1;
  scale = Math.min(Math.max(0.5, scale), 5);
  updateTransform();
});

zoomedImg.addEventListener('mousedown', function (e) {
  e.preventDefault(); // Stop image dragging in browser
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  zoomedImg.style.cursor = 'grabbing';

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    translateX += dx;
    translateY += dy;
    updateTransform();
  }

  function onMouseUp() {
    isDragging = false;
    zoomedImg.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});




    window.onload = () => {
      loadPatients();
      loadTreaters();
      loadPatientPhotos();
      document.getElementById('treatDate').value = getToday();
    };
    
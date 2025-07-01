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

  // ADD THIS LINE to clear the selected card highlight
  selectedTreatmentId = null;
  // Optionally, re-render cards if needed:
  if (typeof renderTreatmentCards === "function" && typeof loadTreatments === "function" && selectedPatientId) {
    loadTreatments(selectedPatientId);
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
let selectedTreatmentId = null; // Add this at the top of your script if not already present


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

  // ADD THIS LINE to render cards for mobile
  renderTreatmentCards(treatments);
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
  // This check is important for the initial page load
  if (!patientId) {
    document.getElementById("photoPreviewContainer").innerHTML = "";
    return;
  }

  const res = await fetch(`/patient_photos/${patientId}`);
  if (!res.ok) {
    console.error("Could not load patient photos.");
    return;
  }

  const photos = await res.json();
  console.log("Photos response:", photos); // <-- Add this line for debugging

  const container = document.getElementById("photoPreviewContainer");
  container.innerHTML = "";

  // Ensure photos is always an array
  let safePhotos = [];
  if (Array.isArray(photos)) {
    safePhotos = photos;
  } else if (photos && typeof photos === "object" && photos.length === undefined) {
    // If you get an object, not an array, try to convert to array (optional)
    safePhotos = Object.values(photos);
  } // else leave as empty array

safePhotos.forEach(photo => {
  if (!photo || !photo.filename) return;

  // Create a wrapper div for positioning
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";
  wrapper.style.margin = "5px";

  // Create the image
  const img = document.createElement("img");
  img.src = `/photos/${photo.filename}`;
  img.classList.add("photo-thumb");
  img.onclick = () => enlargePhoto(img.src);

  // Create the delete button
  const delBtn = document.createElement("span");
  delBtn.textContent = "✖";
  delBtn.title = "Delete photo";
  delBtn.style.position = "absolute";
  delBtn.style.top = "2px";
  delBtn.style.right = "2px";
  delBtn.style.background = "rgba(255,255,255,0.8)";
  delBtn.style.color = "red";
  delBtn.style.borderRadius = "50%";
  delBtn.style.padding = "2px 6px";
  delBtn.style.cursor = "pointer";
  delBtn.style.fontWeight = "bold";
  delBtn.style.fontSize = "16px";
  delBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm("Delete this photo?")) {
      deletePhoto(photo.filename, patientId);
    }
  };

  wrapper.appendChild(img);
  wrapper.appendChild(delBtn);
  container.appendChild(wrapper);
});
}

async function deletePhoto(filename, patientId) {
  const res = await fetch(`/delete_photo/${filename}`, { method: 'DELETE' });
  const result = await res.json();
  alert(result.status || result.error);
  loadPatientPhotos(patientId);
}

async function uploadPhoto() {
  if (!selectedPatientId) return alert("Select a patient first.");
  const input = document.getElementById('photoInput');
  if (!input.files.length) return alert("Choose a photo to upload.");

  const formData = new FormData();
  formData.append('photo', input.files[0]);

  try {
    const res = await fetch(`/upload_photo/${selectedPatientId}`, {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (res.ok) {
      alert(result.status || 'Upload successful!');
      input.value = ''; // Clear the file input

      // <<< FIX: Call the correct function to refresh the gallery >>>
      loadPatientPhotos(selectedPatientId);

    } else {
      alert(result.error || 'Upload failed.');
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    alert('An error occurred during the upload.');
  }
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

function showTab(tab) {
  const tabs = ['patients', 'accounting'];
  tabs.forEach(t => {
    document.getElementById(t + 'Tab').classList.remove('active-tab');
    document.querySelector(`.tab-button[onclick="showTab('${t}')"]`).classList.remove('active');
  });

  document.getElementById(tab + 'Tab').classList.add('active-tab');
  document.querySelector(`.tab-button[onclick="showTab('${tab}')"]`).classList.add('active');
}




async function getAccountingData() {
  const from = document.getElementById('accountingFrom').value;
  const to = document.getElementById('accountingTo').value;
  if (!from || !to) return alert("Please enter both dates in dd/mm/yyyy format.");

  const res = await fetch(`/accounting_data?start=${encodeURIComponent(from)}&end=${encodeURIComponent(to)}`);
  const result = await res.json();
  if (res.ok) {
    document.getElementById('totalCredit').textContent = result.total_credit.toFixed(2);
  } else {
    alert("Error: " + (result.error || "Unknown"));
  }
}

function renderTreatmentCards(treatments) {
  const container = document.getElementById('treatmentCards');
  container.innerHTML = '';
  treatments.forEach(t => {
    const card = document.createElement('div');
    card.className = 'treatment-card';
    if (selectedTreatmentId && t.id == selectedTreatmentId) {
      card.classList.add('selected-card');
    }
    card.innerHTML = `
      <div><strong>Date:</strong> ${formatDate(t.date)}</div>
      <div><strong>Tooth:</strong> ${t.tooth || ''}</div>
      <div><strong>Description:</strong> ${t.description || ''}</div>
      <div><strong>Lab:</strong> ${t.lab || ''}</div>
      <div><strong>Debit:</strong> ${t.debit || ''}</div>
      <div><strong>Credit:</strong> ${t.credit || ''}</div>
      <div><strong>Treated by:</strong> ${(t.treater_name || t.treated_by || '') === 0 ? '' : (t.treater_name || t.treated_by || '')}</div>
    `;
    card.onclick = () => {
      selectedTreatmentId = t.id; // Track selected card
      // Fill the form as before
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

      // Re-render to update highlight
      renderTreatmentCards(treatments);
    };
    container.appendChild(card);
  });
}

window.onload = () => {
  loadPatients();
  loadTreaters();
  // We removed loadPatientPhotos() from here.
  // It is correctly called from loadPatientInfo() when you select a patient.
  document.getElementById('treatDate').value = getToday();
};

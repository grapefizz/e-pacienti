from flask import Flask, jsonify, request, send_file, render_template
import pyodbc
import os
import datetime
import traceback
import uuid
import json
from flask import send_from_directory
from werkzeug.utils import secure_filename


app = Flask(__name__)

app.config['UPLOAD_FOLDER'] = 'photos'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


db_path = os.path.abspath("Teeth.mdb")
conn = pyodbc.connect(
    r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/patients')
def get_patients():
    cursor = conn.cursor()
    cursor.execute("SELECT ID, Name FROM PatientContact")
    return jsonify([{"id": row[0], "name": row[1]} for row in cursor.fetchall()])

@app.route('/patient/<int:patient_id>')
def get_patient(patient_id):
    main_cursor = conn.cursor()
    main_cursor.execute("SELECT * FROM PatientContact WHERE ID=?", (patient_id,))
    row = main_cursor.fetchone()
    if not row:
        return jsonify({"error": "Patient not found"}), 404

    columns = [col[0] for col in main_cursor.description]
    patient = dict(zip(columns, row))  # includes 'ReferredBy'

    # Load personal number from the external JSON
    import json
    if os.path.exists("personal_numbers.json"):
        with open("personal_numbers.json", "r") as f:
            personal_numbers = json.load(f)
    else:
        personal_numbers = {}

    # Add it to the patient dictionary
    patient['personal_number'] = personal_numbers.get(str(patient_id), "")


    # Now fetch Mobile separately using a NEW cursor to avoid overwriting
    try:
        mobile_cursor = conn.cursor()
        mobile_cursor.execute("SELECT Mobile FROM PatientContact WHERE ID=?", (patient_id,))
        mobile_row = mobile_cursor.fetchone()
        if mobile_row and mobile_row[0]:
            patient['Tel'] = mobile_row[0]
    except Exception:
        pass

    # Add alias for frontend display
    patient['personal_number'] = patient.get('personal_number', '')

    return jsonify(patient)


@app.route('/update_patient/<int:patient_id>', methods=['POST'])
def update_patient(patient_id):
    data = request.json
    cursor = conn.cursor()

    personal_number = str(data.get('personal_number', '')).strip()

    # Load current personal numbers from JSON
    if os.path.exists("personal_numbers.json"):
        with open("personal_numbers.json", "r") as f:
            personal_numbers = json.load(f)
    else:
        personal_numbers = {}

    # Validate personal number
    if personal_number and personal_number != "0000000000":
        for pid, number in personal_numbers.items():
            if number == personal_number and int(pid) != patient_id:
                return jsonify({'error': 'This personal number is already registered by another patient.'}), 400

    # Update MDB patient info (excluding personal number)
    try:
        cursor.execute("""
            UPDATE PatientContact
            SET Name=?, Tel=?, BirthDate=?, Address=?, MedicalAlert=?
            WHERE ID=?
        """, (
            data.get('name', ''),
            data.get('tel', ''),
            data.get('dob', ''),
            data.get('address', ''),
            data.get('medical_alert', ''),
            patient_id
        ))
        conn.commit()
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    # Save personal number to JSON file
    personal_numbers[str(patient_id)] = personal_number
    with open("personal_numbers.json", "w") as f:
        json.dump(personal_numbers, f, indent=2)

    return jsonify({"status": "Patient updated successfully"})

@app.route('/add_patient', methods=['POST'])
def add_patient():
    try:
        data = request.json
        personal_number = str(data.get('personal_number', '')).strip()

        # Load existing personal numbers
        if os.path.exists("personal_numbers.json"):
            with open("personal_numbers.json", "r") as f:
                personal_numbers = json.load(f)
        else:
            personal_numbers = {}

        # Validate uniqueness if not "0000000000"
        if personal_number and personal_number != "0000000000":
            if personal_number in personal_numbers.values():
                return jsonify({'error': 'This personal number is already registered by another patient.'}), 400

        # Insert patient WITHOUT using ReferredBy
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO PatientContact (Name, Tel, BirthDate, Address, MedicalAlert)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.get('name', ''),
            data.get('tel', ''),
            data.get('dob', ''),
            data.get('address', ''),
            data.get('medical_alert', '')
        ))
        conn.commit()

        # Get the ID of the newly inserted patient
        cursor.execute("SELECT @@IDENTITY")
        new_id = cursor.fetchone()[0]

        # Save personal number in JSON
        personal_numbers[str(new_id)] = personal_number
        with open("personal_numbers.json", "w") as f:
            json.dump(personal_numbers, f, indent=2)

        return jsonify({'status': 'Patient added successfully'})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@app.route('/delete_patient/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Treating WHERE PatientId=?", (patient_id,))
        cursor.execute("DELETE FROM PatientContact WHERE ID=?", (patient_id,))
        conn.commit()

        # Clean up from personal_numbers.json if needed
        if os.path.exists("personal_numbers.json"):
            with open("personal_numbers.json", "r") as f:
                personal_numbers = json.load(f)
            if str(patient_id) in personal_numbers:
                del personal_numbers[str(patient_id)]
                with open("personal_numbers.json", "w") as f:
                    json.dump(personal_numbers, f, indent=2)

        return jsonify({"status": "Patient deleted"})
    except Exception as e:
        print("Error deleting patient:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/add_treatment/<int:patient_id>', methods=['POST'])
def add_treatment(patient_id):
    try:
        cursor = conn.cursor()
        data = request.json
        cursor.execute("""
            INSERT INTO Treating (PatientId, [Date], ToothNo, Description, Lab, Debit, Credit, Tratedby)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            patient_id,
            data.get('date', ''),
            data.get('tooth', ''),
            data.get('description', ''),
            data.get('lab', ''),
            float(data.get('debit') or 0),
            float(data.get('credit') or 0),
            int(data.get('treated_by') or 0)
        ))
        conn.commit()
        return jsonify({"status": "Treatment added"})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/treatments/<int:patient_id>')
def get_treatments(patient_id):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT T.ID, T.Date, T.ToothNo, T.Description, T.Lab, T.Debit, T.Credit, T.Tratedby, R.Name
            FROM Treating T
            LEFT JOIN Treaters R ON T.Tratedby = R.ID
            WHERE T.PatientId = ?
            ORDER BY T.Date DESC
        """, (patient_id,))
        rows = cursor.fetchall()
        treatments = []
        for row in rows:
            treatments.append({
                "id": row[0],
                "date": row[1],
                "tooth": row[2],
                "description": row[3],
                "lab": row[4],
                "debit": row[5],
                "credit": row[6],
                "treater_id": row[7],
                "treater_name": row[8] or ""
            })
        return jsonify(treatments)
    except Exception as e:
        print("Error in get_treatments:", e)
        return jsonify({'error': str(e)}), 500



@app.route('/delete_treatment/<int:treatment_id>', methods=['DELETE'])
def delete_treatment(treatment_id):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Treating WHERE ID=?", (treatment_id,))
    conn.commit()
    return jsonify({"status": "Treatment deleted"})

@app.route('/treaters')
def get_treaters():
    cursor = conn.cursor()
    cursor.execute("SELECT ID, Name FROM Treaters")
    treaters = [{"id": row[0], "name": row[1]} for row in cursor.fetchall()]
    if treaters:
        treaters.insert(0, {"id": 0, "name": treaters[0]["name"]})
    return jsonify(treaters)

@app.route('/update_treatment/<int:treatment_id>', methods=['POST'])
def update_treatment(treatment_id):
    try:
        data = request.json
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Treating SET
                [Date] = ?, ToothNo = ?, Description = ?, Lab = ?,
                Debit = ?, Credit = ?, Tratedby = ?, PatientId = ?
            WHERE ID = ?
        """, (
            data.get('date', ''),
            data.get('tooth_no', ''),
            data.get('description', ''),
            data.get('lab', ''),
            float(data.get('debit') or 0),
            float(data.get('credit') or 0),
            int(data.get('treated_by') or 0),
            int(data.get('patient_id')),
            treatment_id
        ))
        conn.commit()
        return jsonify({"status": "Treatment updated"})
    except Exception as e:
        return jsonify({'error': str(e)}), 500






PHOTO_FOLDER = 'photos'
PHOTO_JSON = 'photos.json'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Ensure folder and JSON file exist
os.makedirs(PHOTO_FOLDER, exist_ok=True)
if not os.path.exists(PHOTO_JSON):
    with open(PHOTO_JSON, 'w') as f:
        json.dump({}, f)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_photo_data():
    with open(PHOTO_JSON, 'r') as f:
        return json.load(f)

def save_photo_data(data):
    with open(PHOTO_JSON, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/upload_photo/<int:patient_id>', methods=['POST'])
def upload_photo(patient_id):
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Optionally, make filename unique per patient
        filename = f"{patient_id}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        # Load existing photo data
        if os.path.exists('photos.json'):
            with open('photos.json', 'r') as f:
                all_photos = json.load(f)
        else:
            all_photos = {}

        # Ensure patient_id key exists and is a list
        pid = str(patient_id)
        if pid not in all_photos or not isinstance(all_photos[pid], list):
            all_photos[pid] = []

        # Append new photo info
        all_photos[pid].append({
            'patient_id': patient_id,
            'filename': filename
        })

        # Save back to file
        with open('photos.json', 'w') as f:
            json.dump(all_photos, f, indent=2)

        return jsonify({'status': 'Photo uploaded', 'filename': filename})
    else:
        return jsonify({'error': 'Invalid file type'}), 400

@app.route('/photos/<filename>')
def get_photo(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))

@app.route('/photos/<path:filename>')
def serve_photo(filename):
    return send_from_directory('photos', filename)

@app.route('/patient_photos/<int:patient_id>')
def get_patient_photos(patient_id):
    if not os.path.exists("photos.json"):
        return jsonify([])

    with open("photos.json", "r") as f:
        all_photos = json.load(f)

    return jsonify(all_photos.get(str(patient_id), []))

@app.route('/delete_photo/<filename>', methods=['DELETE'])
def delete_photo(filename):
    # Load all photos
    with open('photos.json', 'r') as f:
        all_photos = json.load(f)

    found = False
    # Remove the photo from the correct patient's list
    for pid, photos in all_photos.items():
        new_photos = [p for p in photos if p['filename'] != filename]
        if len(new_photos) != len(photos):
            all_photos[pid] = new_photos
            found = True
            # Optionally, delete the file from disk
            photo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(photo_path):
                os.remove(photo_path)
            break

    if found:
        with open('photos.json', 'w') as f:
            json.dump(all_photos, f, indent=2)
        return jsonify({'status': 'Photo deleted'})
    else:
        return jsonify({'error': 'Photo not found'}), 404

    

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def load_photos():
    try:
        with open('photos.json', 'r') as f:
            return json.load(f)
    except:
        return {}

def save_photos(data):
    with open('photos.json', 'w') as f:
        json.dump(data, f, indent=2)


@app.route('/accounting_data', methods=['GET'])
def accounting_data():
    from datetime import datetime

    try:
        start = request.args.get('start')
        end = request.args.get('end')

        # Convert from dd/mm/yyyy to mm/dd/yyyy
        start_date = datetime.strptime(start, "%d/%m/%Y").strftime("%m/%d/%Y")
        end_date = datetime.strptime(end, "%d/%m/%Y").strftime("%m/%d/%Y")

        cursor = conn.cursor()
        query = f"""
            SELECT SUM(Credit) FROM Treating
            WHERE [Date] >= #{start_date}# AND [Date] <= #{end_date}#
        """
        cursor.execute(query)
        result = cursor.fetchone()
        total = result[0] if result and result[0] is not None else 0

        return jsonify({'total_credit': total})
    except Exception as e:
        print("Error in /accounting_data:", e)
        return jsonify({'error': str(e)}), 500





if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

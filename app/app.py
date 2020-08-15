from flask import Flask, render_template, request, redirect, url_for, send_from_directory
from flask_socketio import SocketIO, emit
from excel_join import Excel_join
from CheckMC import calc_vif
import os, sys

app = Flask(__name__)
socketio = SocketIO(app)
app.config['UPLOAD_EXTENSIONS'] = ['csv']
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['DOWNLOAD'] = 'result'

filename_list = []
master_obj = None

#Checks for allowed file extension             
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['UPLOAD_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download')
def download():
    return send_from_directory(app.config['DOWNLOAD'], 'joined.csv', as_attachment=True)

#Handles file uploads
@app.route('/', methods=['POST'])
def upload_files():
    global filename_list
    uploaded_file = request.files['file']
    name = uploaded_file.filename
    if allowed_file(name) and len(filename_list) <= 5:
        filename_list.append(name)
        uploaded_file.save(os.path.join(app.config['UPLOAD_FOLDER'], name))
    else:
        socketio.emit('error', 'test')
    return redirect(url_for('index'))

#Creates Excel-join object
@socketio.on('create object')
def init():
    global master_obj
    if filename_list != []:
        master_obj = Excel_join(filename_list)
        socketio.emit('object created', {'data' : filename_list})
    else:
        socketio.emit('error', 'No csv file uploaded')

#Gets column names from file
@socketio.on('column names request')
def column_names(data):
    global master_obj
    name = data['data']
    pos = data['position']
    headers = master_obj.get_headers(name)
    socketio.emit('column names response', {'data' : headers, 'position' : pos})

#Resets the Excel-join object
@socketio.on('reset')
def reset():
    global master_obj
    master_obj.redundant_cols = []
    master_obj.already_joined = []
    master_obj.joined = None

#Handles the joining of files
@socketio.on('join request')
def join(data):
    global master_obj
    joins = data['data']
    try:
        for join in joins:
            master_obj.join(join['file1'], join['file2'], join['col1'], join['col2'])
        master_obj.delete_duplicate_cols()
        master_obj.publish()
        count, msg = calc_vif(master_obj.joined)
        socketio.emit('join response', {'count' : count, 'msg' : msg})
    except:
        socketio.emit('error', 'An error has occured; please check data type consistencies between columns')

#Remove files from the dropzone (the client request for this is emitted in the dropzone.js file)
@socketio.on('remove file request')
def remove(data):
    global filename_list
    name = data['data']
    if (name in filename_list):
        filename_list.remove(name)
        os.remove(os.path.join(app.config['UPLOAD_FOLDER'], name))

#Clear directory on refresh
@socketio.on('refresh')
def refresh():
    global filename_list
    global master_obj
    master_obj = None
    filename_list = []
    for file in [file for file in os.listdir(app.config['UPLOAD_FOLDER']) if not file.startswith('.')]:
        os.remove(os.path.join(app.config['UPLOAD_FOLDER'],file))
    for file in [file for file in os.listdir(app.config['DOWNLOAD']) if not file.startswith('.')]:
        os.remove(os.path.join(app.config['DOWNLOAD'], file))
    
if __name__ == '__main__':
    socketio.run(app, debug=True)

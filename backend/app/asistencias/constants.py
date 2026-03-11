# Constantes para el sistema AsistencIA

# Tipos de persona en ISAE
TIPOS_ISAE = {
    'ESTUDIANTE': 'Estudiante',
    'DOCENTE': 'Docente',
    'PERSONAL': 'Personal'
}

# Instituciones
INSTITUCIONES = {
    'ISAE': 'ISAE',
}

# Estados de asistencia
ESTADOS_ASISTENCIA = {
    'PRESENTE': 'Presente',
    'AUSENTE': 'Ausente', 
    'TARDANZA': 'Tardanza',
    'JUSTIFICADO': 'Justificado',
    'ENFERMEDAD': 'Enfermedad',
    'FUERA_DE_HORARIO': 'Fuera de Horario',
    'SE_FUE_ANTES': 'Se fue antes',
    'NO_PASO_SALIDA': 'No pasó a la salida'
}

# Configuración MQTT
MQTT_TOPICS = {
    'REC': 'mqtt/face/{device_id}/rec',
    'SNAP': 'mqtt/face/{device_id}/snap', 
    'ACK': 'mqtt/face/{device_id}/ack',
    'COMMAND': 'mqtt/face/{device_id}'
}

# Configuración del terminal biométrico
LECTOR_CONFIG = {
    'DEVICE_ID': '1379241',
    'DEVICE_IP': '192.168.210.101',
    'API_USER': 'admin',
    'API_PASSWORD': 'admin1234',
    'PERSON_TYPE_ESTUDIANTE': '0',
    'PERSON_TYPE_PERSONAL': '1',
    'VERIFY_STATUS_SUCCESS': '1',
    'VERIFY_STATUS_FAIL': '0'
}

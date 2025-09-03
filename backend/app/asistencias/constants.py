# Constantes para el sistema AsistencIA

# Tipos de persona en ISAE
TIPOS_ISAE = {
    'ESTUDIANTE': 'Estudiante',
    'PROFESOR': 'Profesor', 
    'ADMINISTRATIVO': 'Personal Administrativo',
    'MANTENIMIENTO': 'Personal de Mantenimiento',
    'DIRECTOR': 'Director'
}

# Tipos de persona en TecnoAliados
TIPOS_TECNO = {
    'ESTUDIANTE': 'Estudiante TecnoAliados',
    'INSTRUCTOR': 'Instructor TecnoAliados'
}

# Instituciones
INSTITUCIONES = {
    'ISAE': 'ISAE',
    'TECNOALIADOS': 'TecnoAliados'
}

# Estados de asistencia
ESTADOS_ASISTENCIA = {
    'PRESENTE': 'Presente',
    'AUSENTE': 'Ausente', 
    'TARDANZA': 'Tardanza',
    'JUSTIFICADO': 'Justificado',
    'ENFERMEDAD': 'Enfermedad'
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
    'PERSON_TYPE_ESTUDIANTE': '0',
    'PERSON_TYPE_PERSONAL': '1',
    'VERIFY_STATUS_SUCCESS': '1',
    'VERIFY_STATUS_FAIL': '0'
}

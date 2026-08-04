# Scripts

Utility scripts for development and testing. **Do not run these in production.**

## `mqtt/`

Scripts to simulate MQTT messages from the biometric terminal — useful for local testing without the physical device.

| File | Description |
|---|---|
| `test_mqtt_2.py` | Sends a single attendance event via MQTT |
| `test_mqtt_3.py` | Sends a batch of attendance events via MQTT |
| `test_suite.py` | Full MQTT integration test suite |

**Usage** (broker must be running):

```bash
python scripts/mqtt/test_mqtt_2.py
```

## `data/`

Scripts and dumps for managing test data in the database.

| File | Description |
|---|---|
| `populate_data.py` | Populates the DB with random test data |
| `manage_test_data.py` | Add/remove test data via CLI |
| `add_test_data.sh` | Shell wrapper to add test data |
| `remove_test_data.sh` | Shell wrapper to remove test data |
| `asistencias.sql` | SQL dump (snapshot) of the database |

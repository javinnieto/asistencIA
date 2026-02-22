import json

with open('/home/radex/asistencIA/miniapp_mqtt_protocol/data.json') as f:
    data = json.load(f)

for table in data['tables']:
    for row in table['rows']:
        if any('searchperson' in str(cell).lower().replace(' ', '') for cell in row):
            print('--- PAGE', table['page'], '---')
            for r in table['rows']:
                print('| ' + ' | '.join(str(c)[:50].replace('\n', ' ') for c in r) + ' |')
            break

import pdfplumber
import json
import os

pdf_path = '/tmp/pdf.pdf' # This is where the manual was copied in previous steps. Wait, I should make sure I use the actual /tmp/pdf.pdf
real_pdf_path = '/tmp/pdf.pdf'

extracted_data = {
    'commands': [],
    'tables': [],
    'text_with_personid': []
}

try:
    with pdfplumber.open(real_pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            # Extract text
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                for j, line in enumerate(lines):
                    if 'personid' in line.lower().replace(' ', ''):
                        context = '\n'.join(lines[max(0, j-3):min(len(lines), j+4)])
                        extracted_data['text_with_personid'].append({
                            'page': i + 1,
                            'context': context
                        })
            
            # Extract tables
            tables = page.extract_tables()
            for t in tables:
                if not t: continue
                
                # Check if it's a parameter table
                headers = [str(h).replace('\n', ' ').strip().lower() for h in t[0] if h]
                is_param_table = any(h in ['key', 'type', 'description', 'values'] for h in headers)
                
                table_obj = {
                    'page': i + 1,
                    'headers': headers,
                    'rows': []
                }
                
                for row in t[1:]:
                    if not row: continue
                    row_data = [str(c).replace('\n', ' ').strip() if c else '' for c in row]
                    table_obj['rows'].append(row_data)
                    
                extracted_data['tables'].append(table_obj)

    os.makedirs('/home/radex/asistencIA/miniapp_mqtt_protocol', exist_ok=True)
    with open('/home/radex/asistencIA/miniapp_mqtt_protocol/data.json', 'w') as f:
        json.dump(extracted_data, f, indent=2)
    print("Extraction successful. Saved to data.json")

except Exception as e:
    print("Error:", e)

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pathlib import Path

out_dir = Path(r'C:\Users\HP\Canton Hack\output\pdf')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'damllens-problem-value-statement.pdf'

doc = SimpleDocTemplate(
    str(out_file),
    pagesize=letter,
    rightMargin=0.62 * inch,
    leftMargin=0.62 * inch,
    topMargin=0.55 * inch,
    bottomMargin=0.5 * inch,
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='TitleTight',
    parent=styles['Title'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=21,
    textColor=colors.HexColor('#0B1720'),
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name='Section',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=10.6,
    leading=12.4,
    textColor=colors.HexColor('#0F766E'),
    spaceBefore=8,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name='BodyTight',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=12.6,
    textColor=colors.HexColor('#1F2937'),
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name='ValueBox',
    parent=styles['BodyText'],
    fontName='Helvetica-Bold',
    fontSize=9.8,
    leading=12.8,
    textColor=colors.HexColor('#0B1720'),
))
styles.add(ParagraphStyle(
    name='Small',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.1,
    leading=10.2,
    textColor=colors.HexColor('#4B5563'),
))

story = []
story.append(Paragraph('Problem & Value Statement: Daml Workflow Visibility', styles['TitleTight']))

core = ('Canton/Daml app teams struggle to understand and monitor live contract workflows because ledger events, parties, permissions, and contract state are fragmented and hard to interpret. '
        'We solve this by turning Daml activity into visual workflow timelines, party-permission maps, and state alerts, so teams can debug faster, explain workflows clearly, and catch stuck or risky processes earlier.')
box = Table([[Paragraph(core, styles['ValueBox'])]], colWidths=[7.25 * inch])
box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ECFDF5')),
    ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#10B981')),
    ('LEFTPADDING', (0, 0), (-1, -1), 9),
    ('RIGHTPADDING', (0, 0), (-1, -1), 9),
    ('TOPPADDING', (0, 0), (-1, -1), 7),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
]))
story.append(box)
story.append(Spacer(1, 5))

sections = [
    ('Problem statement', 'When a Daml/Canton workflow breaks, the user cannot quickly see what state the contract is in, which choice was exercised, who had authority, who could observe it, or where the process became stuck.'),
    ('Who it is for', 'A Daml application engineer building or operating a Canton-based financial workflow app during debugging, demo prep, or live monitoring.'),
    ('Current workaround', 'They reconstruct workflow state from raw ledger events, backend logs, JSON API responses, SQL/indexer tables, generic explorers, local test traces, and manual reading of Daml templates and choices.'),
    ('Why that fails', 'The view is fragmented. Debugging slows down, engineers lose time translating ledger activity into business meaning, non-engineers cannot understand what happened without help, and stuck or risky workflows can be missed because state, parties, permissions, and choices are not shown together.'),
    ('Why now', 'Canton is moving real-world finance and institutional workflows onchain, and HackCanton is bringing new builders into the ecosystem now. Daml\'s multi-party workflow model is powerful, but its complexity creates an immediate need for clearer builder and operator tooling.'),
]

for title, body in sections:
    story.append(Paragraph(title, styles['Section']))
    story.append(Paragraph(body, styles['BodyTight']))

story.append(Paragraph('Evidence', styles['Section']))
evidence = [
    'Canton developer resources list tooling for Daml development, live/indexed transactions, wallet metrics, validator metrics, and explorers.',
    'Daml docs cover parties, authority, observers, choices, active contracts, archived contracts, JSON API, Ledger API, and app architecture.',
    'Public Daml GitHub activity points to an active but niche developer ecosystem, matching the product\'s specialized ICP.',
]
for item in evidence:
    story.append(Paragraph('- ' + item, styles['Small']))

story.append(Spacer(1, 7))
story.append(Paragraph('Validation note: within 48 hours, DM 10-15 Canton/Daml/HackCanton builders. Success metric: at least 5 replies, with 3+ confirming pain around contract state, parties, choices, permissions, or workflow progress.', styles['Small']))
story.append(Spacer(1, 5))
story.append(Paragraph('Sources: canton.network/developer-resources; docs.daml.com; github.com/digital-asset/daml', styles['Small']))

doc.build(story)
print(out_file)

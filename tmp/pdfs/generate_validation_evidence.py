from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pathlib import Path

out_dir = Path(r'C:\Users\HP\Canton Hack\output\pdf')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'damllens-validation-evidence-metrics.pdf'

doc = SimpleDocTemplate(
    str(out_file),
    pagesize=letter,
    rightMargin=0.58 * inch,
    leftMargin=0.58 * inch,
    topMargin=0.48 * inch,
    bottomMargin=0.45 * inch,
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='TitleTight',
    parent=styles['Title'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=21,
    textColor=colors.HexColor('#0B1720'),
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name='Section',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=10.1,
    leading=11.7,
    textColor=colors.HexColor('#0F766E'),
    spaceBefore=6,
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name='Body',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.85,
    leading=11.35,
    textColor=colors.HexColor('#1F2937'),
    spaceAfter=1.5,
))
styles.add(ParagraphStyle(
    name='Metric',
    parent=styles['BodyText'],
    fontName='Helvetica-Bold',
    fontSize=9.55,
    leading=12.3,
    textColor=colors.HexColor('#0B1720'),
))

story = []
story.append(Paragraph('Validation Evidence & Metrics: DamlLens', styles['TitleTight']))

summary = ('Early conversations show a repeated problem: Daml/Canton builders and operators can inspect raw events, logs, and API output, but still struggle to translate that data into workflow state, party authority and visibility, and business meaning.')
box = Table([[Paragraph(summary, styles['Metric'])]], colWidths=[7.35 * inch])
box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ECFDF5')),
    ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#10B981')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(box)
story.append(Spacer(1, 3))

sections = [
    ('1. Problem evidence', [
        'Interview notes repeatedly mentioned having to use logs, JSON API responses, template code, explorers, indexer tables, and manual traces to understand what happened.',
        'Respondents described difficulty seeing whether a workflow is waiting, completed, stuck, active, or archived.',
        'Several responses centered on unclear authority and visibility: who could act, who could observe, and how controllers/signatories/observers relate to the workflow.',
        'The pain showed up in debugging, demo prep, live monitoring, stakeholder explanation, ops review, and learning.',
    ]),
    ('2. Who we talked to', [
        '12 early conversations total.',
        'Roughly half were in or close to the primary ICP: Daml application engineers and backend/integration engineers.',
        'The rest were adjacent roles: Canton platform engineers, hackathon builders, workflow operators, and compliance/ops reviewers.',
    ]),
    ('3. Repeated pain themes', [
        'Workflow state is hard to reconstruct from low-level data.',
        'Party authority and observer visibility are unclear without reading code or asking engineers.',
        'Current tooling is fragmented across logs, APIs, explorers, tables, scripts, and manual code reading.',
        'Users want workflow-level views: timelines, status labels, active/archived history, and party-permission maps.',
    ]),
    ('4. What changed in our thinking', [
        'The primary user stays focused: Daml application engineer at a Canton-based financial workflow team.',
        'Secondary users exist, but the MVP should not try to serve everyone at once.',
        'The MVP should focus on workflow timeline, active/archived contract history, party-permission visibility, and stuck/completed status.',
    ]),
]

for title, bullets in sections:
    story.append(Paragraph(title, styles['Section']))
    for bullet in bullets:
        story.append(Paragraph('- ' + bullet, styles['Body']))

story.append(Paragraph('5. Success metric', styles['Section']))
metric = ('We will know this works when a Daml application engineer can understand why a real workflow stopped and who can act on it in under 60 seconds using the demo.')
metric_box = Table([[Paragraph(metric, styles['Metric'])]], colWidths=[7.35 * inch])
metric_box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
    ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#CBD5E1')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(metric_box)

story.append(Paragraph('6. Next validation target', styles['Section']))
for bullet in [
    'Continue outreach until we have 10-15 total outreach attempts documented.',
    'Minimum threshold: 5 replies, 3+ strong pain confirmations, and 1-2 users willing to try the demo.',
    'Demo test: give users one real workflow scenario and measure whether they can identify stopped state, last exercised choice, and next authorized party in under 60 seconds.',
]:
    story.append(Paragraph('- ' + bullet, styles['Body']))

doc.build(story)
print(out_file)

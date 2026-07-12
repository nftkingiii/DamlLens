from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pathlib import Path

out_dir = Path(r'C:\Users\HP\Canton Hack\output\pdf')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'damllens-icp-audience-definition.pdf'

doc = SimpleDocTemplate(
    str(out_file),
    pagesize=letter,
    rightMargin=0.62 * inch,
    leftMargin=0.62 * inch,
    topMargin=0.58 * inch,
    bottomMargin=0.55 * inch,
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
    fontSize=10.7,
    leading=12.5,
    textColor=colors.HexColor('#0F766E'),
    spaceBefore=8,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name='Body',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=9.7,
    leading=12.9,
    textColor=colors.HexColor('#1F2937'),
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name='Anchor',
    parent=styles['BodyText'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=13.2,
    textColor=colors.HexColor('#0B1720'),
))
styles.add(ParagraphStyle(
    name='Small',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.4,
    leading=10.5,
    textColor=colors.HexColor('#4B5563'),
))

story = []
story.append(Paragraph('ICP & Audience Definition: DamlLens', styles['TitleTight']))

anchor = ('A Daml application engineer at a Canton-based financial workflow team who needs to understand contract state, party authority, and workflow progress during debugging, demo prep, and live monitoring, but currently has to reconstruct it from logs, JSON API responses, explorers, and code, which fails because the view is fragmented and hard to explain.')
box = Table([[Paragraph(anchor, styles['Anchor'])]], colWidths=[7.25 * inch])
box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ECFDF5')),
    ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#10B981')),
    ('LEFTPADDING', (0, 0), (-1, -1), 9),
    ('RIGHTPADDING', (0, 0), (-1, -1), 9),
    ('TOPPADDING', (0, 0), (-1, -1), 7),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
]))
story.append(box)
story.append(Spacer(1, 6))

sections = [
    ('Role', 'Daml application engineer. This person writes or integrates Daml templates, tests contract workflows, and helps the team understand whether the app is behaving correctly on Canton.'),
    ('Context', 'The pain appears during debugging, demo prep, and live monitoring of a Canton-based financial workflow app, especially when contracts are created, choices are exercised, parties interact, or workflows get stuck.'),
    ('Pain', 'They cannot quickly see the contract state, party authority, observer visibility, exercised choices, or workflow progress in one clear view. When something breaks, they have to translate technical ledger activity into business meaning.'),
    ('Current workaround', 'They reconstruct the workflow from backend logs, JSON API responses, SQL or indexer tables, generic explorers, local test traces, and manual reading of Daml templates and choices.'),
    ('Why they care', 'If they cannot solve it, debugging slows down, demos break or become harder to explain, authority and visibility are unclear, and stuck or risky workflow issues can be missed until late.'),
]

for title, body in sections:
    story.append(Paragraph(title, styles['Section']))
    story.append(Paragraph(body, styles['Body']))

story.append(Spacer(1, 10))
story.append(Paragraph('Short slide version', styles['Section']))
story.append(Paragraph('Daml application engineers at Canton-based financial workflow teams who need to debug and explain contract workflows, but must piece together state from logs, JSON API responses, explorers, and code.', styles['Small']))

story.append(Spacer(1, 7))
story.append(Paragraph('Scope note: this ICP intentionally excludes broad ecosystem users, generic Web3 builders, investors, and multiple personas. The first user is the engineer who feels the workflow visibility problem directly.', styles['Small']))

doc.build(story)
print(out_file)

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pathlib import Path

out_dir = Path(r'C:\Users\HP\Canton Hack\output\pdf')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'damllens-gtm-materials.pdf'

doc = SimpleDocTemplate(
    str(out_file),
    pagesize=letter,
    rightMargin=0.55 * inch,
    leftMargin=0.55 * inch,
    topMargin=0.46 * inch,
    bottomMargin=0.44 * inch,
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
    fontSize=10.2,
    leading=11.8,
    textColor=colors.HexColor('#0F766E'),
    spaceBefore=6,
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name='Body',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.55,
    leading=10.9,
    textColor=colors.HexColor('#1F2937'),
    spaceAfter=1.1,
))
styles.add(ParagraphStyle(
    name='Strong',
    parent=styles['BodyText'],
    fontName='Helvetica-Bold',
    fontSize=8.8,
    leading=11.1,
    textColor=colors.HexColor('#0B1720'),
))
styles.add(ParagraphStyle(
    name='OneLiner',
    parent=styles['BodyText'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=11.8,
    textColor=colors.HexColor('#0B1720'),
))

story = []
story.append(Paragraph('GTM Materials: DamlLens', styles['TitleTight']))

one_liners = [
    ('Acquisition channel', 'HackCanton S2 community, direct DMs, and Canton/Daml technical channels.'),
    ('Activation hook', 'A 2-minute demo that shows why a workflow stopped, who can act, and what changed.'),
    ('Retention driver', 'Users come back whenever they need to debug, explain, or review a workflow faster than using logs, JSON API, or code.'),
]
rows = []
for label, text in one_liners:
    rows.append([Paragraph(label, styles['Strong']), Paragraph(text, styles['Body'])])
summary_table = Table(rows, colWidths=[1.75 * inch, 5.65 * inch])
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ECFDF5')),
    ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#10B981')),
    ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#A7F3D0')),
    ('LEFTPADDING', (0, 0), (-1, -1), 7),
    ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(summary_table)
story.append(Spacer(1, 3))

story.append(Paragraph('1. First 10 users', styles['Section']))
story.append(Paragraph('We get the first 10 manually from places where Daml/Canton builders already are.', styles['Body']))
for bullet in [
    'Targets: HackCanton S2 participants, Daml application engineers, Canton platform/integration engineers, builders asking technical questions, and people posting about Canton/Daml on X or LinkedIn.',
    'DM 20-30 HackCanton builders with: "Can I show you a 2-minute demo for understanding Daml workflow state and permissions?"',
    'Post short demo clips in HackCanton community channels and ask for feedback.',
    'Reply to Canton/Daml technical threads with useful workflow-debugging insight, then invite people to try the demo.',
    'Ask workshop hosts, mentors, or AppsFactory team members to point us to builders working on multi-party workflows.',
    'Offer to map one real workflow from a team project into DamlLens as a free feedback session.',
]:
    story.append(Paragraph('- ' + bullet, styles['Body']))
story.append(Paragraph('Goal: get 10 builders to try the demo and give feedback, not just express interest.', styles['Strong']))

story.append(Paragraph('2. First 100 users', styles['Section']))
story.append(Paragraph('What scales from the first 10 is the workflow walkthrough: repeatable examples that show DamlLens making a workflow easier to understand.', styles['Body']))
for bullet in [
    'Create before/after workflow debugging clips.',
    'Post short examples showing active vs archived contracts, stopped workflows, and party-permission relationships.',
    'Publish example maps for invoice financing, collateral settlement, and approval workflows.',
    'Share templates for common Daml workflows and a public demo link with sample workflows.',
    'Post community updates after each improvement, tied to user feedback.',
    'Distribute through HackCanton, Canton/Daml developer channels, X/LinkedIn, GitHub README/demo repo, ecosystem partner intros, workshops, and office hours.',
]:
    story.append(Paragraph('- ' + bullet, styles['Body']))
story.append(Paragraph('Goal: get 100 builders/operators to open the demo, with at least 20 completing the sample workflow inspection task.', styles['Strong']))

story.append(Paragraph('3. Growth lever', styles['Section']))
story.append(Paragraph('The main growth lever is community-led developer distribution through shareable workflow maps.', styles['Body']))
for bullet in [
    'Every useful output should be shareable: workflow timeline, party-permission map, stuck workflow explanation, or demo/debug report.',
    'When one engineer uses DamlLens to explain a workflow to teammates, judges, mentors, or operators, the artifact naturally exposes the tool to more people.',
]:
    story.append(Paragraph('- ' + bullet, styles['Body']))
loop = 'Growth loop: builder imports or simulates workflow -> DamlLens generates readable workflow map -> builder shares it in demo/review/debugging -> other Daml/Canton builders see the value -> they try it on their own workflow.'
story.append(Paragraph(loop, styles['Strong']))

doc.build(story)
print(out_file)

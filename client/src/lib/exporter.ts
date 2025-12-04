
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, ImageRun } from 'docx';
import { Chart } from 'chart.js';
import type { ReportsData } from '@shared/schema';

const getChartAsBase64Image = (chart: Chart | null): string => {
  if (!chart) return '';
  return chart.toBase64Image();
};

const addChartToPdf = (doc: any, chart: Chart | null, title: string) => {
  const image = getChartAsBase64Image(chart);
  if (image) {
    doc.addPage().fontSize(16).text(title, { align: 'center' }).moveDown();
    doc.image(image, {
      fit: [500, 400],
      align: 'center',
      valign: 'center'
    });
  }
};

export const exportToPdf = async (reportsData: ReportsData, charts: { [key: string]: Chart | null }) => {
  const PDFDocument = (await import('pdfkit/js/pdfkit.standalone')).default;
  const blobStream = (await import('blob-stream')).default;

  const doc = new PDFDocument();
  const stream = doc.pipe(blobStream());

  doc.fontSize(25).text('Reports & Analytics', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Total Documents: ${reportsData.totalDocuments}`);
  doc.text(`Total Pages: ${reportsData.totalPages}`);
  doc.text(`Total Words: ${reportsData.totalWords}`);

  addChartToPdf(doc, charts.documentsOverTime, 'Documents Over Time');
  addChartToPdf(doc, charts.entityDistribution, 'Entity Distribution');
  addChartToPdf(doc, charts.topKeywords, 'Top Keywords');
  addChartToPdf(doc, charts.statusDistribution, 'Document Status');

  doc.end();
  stream.on('finish', () => {
    const blob = stream.toBlob('application/pdf');
    saveAs(blob, 'reports.pdf');
  });
};

export const exportToWord = async (reportsData: ReportsData, charts: { [key: string]: Chart | null }) => {
  const children = [
    new Paragraph({ text: "Reports & Analytics", style: "Heading1"}),
    new Paragraph({ text: `Total Documents: ${reportsData.totalDocuments}` }),
    new Paragraph({ text: `Total Pages: ${reportsData.totalPages}` }),
    new Paragraph({ text: `Total Words: ${reportsData.totalWords}` }),
  ];

  for (const [key, chart] of Object.entries(charts)) {
    const image = getChartAsBase64Image(chart);
    if (image) {
        const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        children.push(new Paragraph({ text: title, style: "Heading2" }));
        const imageBuffer = Buffer.from(image.split(',')[1], 'base64');
        children.push(new Paragraph({children: [new ImageRun({data: imageBuffer, transformation: {width: 500, height: 300}})]}));
    }
  }

  const doc = new Document({
    styles: {
        paragraphStyles: [
            {
                id: "Heading1",
                name: "Heading 1",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: {
                    size: 32,
                    bold: true,
                    color: "000000",
                },
                paragraph: {
                    spacing: { after: 240 },
                },
            },
            {
                id: "Heading2",
                name: "Heading 2",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: {
                    size: 24,
                    bold: true,
                    color: "000000",
                },
                paragraph: {
                    spacing: { before: 240, after: 120 },
                },
            },
        ],
    },
    sections: [{
        properties: {},
        children: children,
      },],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "reports.docx");
};

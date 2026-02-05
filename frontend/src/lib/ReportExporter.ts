import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ApplicationData {
    company: string;
    role: string;
    status: string;
    dateApplied: string;
    visaSponsorship: boolean;
}

interface AnalyticsSnapshot {
    totalApplications: number;
    responseRate: number;
    visaSponsorshipRate: number;
    topCompanies: { name: string; count: number }[];
}

interface JsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

export const exportIntelligenceReport = (
    applications: ApplicationData[],
    stats: AnalyticsSnapshot,
    timeframe: string
) => {
    const doc = new jsPDF() as unknown as JsPDFWithAutoTable;
    const timestamp = new Date().toLocaleString();

    // Set Bauhaus Document Header
    doc.setFillColor(33, 33, 33); // Surface Contrast
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(230, 126, 34); // Primary Orange (#E67E22)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('KRISIS', 20, 25);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CAREER APPLICATION REPORT', 20, 32);
    doc.text(`Generated: ${timestamp}`, 190, 32, { align: 'right' });

    // Summary Section
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(14);
    doc.text('Key Metrics', 20, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Timeframe: ${timeframe.toUpperCase()}`, 20, 62);

    // Quick Metrics Table
    autoTable(doc, {
        startY: 70,
        head: [['Metric', 'Value', 'Insight']],
        body: [
            ['Total Applications', stats.totalApplications.toString(), 'Total tracked applications'],
            ['Response Rate', `${stats.responseRate}%`, 'Percentage of applications with responses'],
            ['Visa Sponsorship', `${stats.visaSponsorshipRate}%`, 'Rate of applications requiring sponsorship'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [33, 33, 33], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 }
    });

    // Detailed Pipeline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Detailed Application History', 20, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Company', 'Position', 'Applied On', 'Status', 'Sponsorship']],
        body: applications.map(app => [
            app.company,
            app.role,
            app.dateApplied,
            app.status,
            app.visaSponsorship ? 'Required' : 'Standard'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Footer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = doc.internal as any;
    const pageCount = internal.getNumberOfPages ? internal.getNumberOfPages() : 0;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `KRISIS Career Tracker - Page ${i} of ${pageCount}`,
            105,
            285,
            { align: 'center' }
        );
    }

    // Save with precise nomenclature
    const fileName = `KRISIS_Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

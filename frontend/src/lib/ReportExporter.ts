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

export const exportIntelligenceReport = (
    applications: ApplicationData[],
    stats: AnalyticsSnapshot,
    timeframe: string
) => {
    const doc = new jsPDF();
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
    doc.text('INTELLIGENCE ARCHITECTURE REPORT', 20, 32);
    doc.text(`Generated: ${timestamp}`, 190, 32, { align: 'right' });

    // Summary Section
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(14);
    doc.text('Core Metrics Snapshot', 20, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Timeline Context: ${timeframe.toUpperCase()}`, 20, 62);

    // Quick Metrics Table
    autoTable(doc, {
        startY: 70,
        head: [['Metric', 'Value', 'Insight']],
        body: [
            ['Total Pipeline Volume', stats.totalApplications.toString(), 'Aggregated across all status nodes'],
            ['Interview Velocity', `${stats.responseRate}%`, 'Current market engagement rate'],
            ['Residency Spons. Rate', `${stats.visaSponsorshipRate}%`, 'Visa requirement frequency'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [33, 33, 33], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 }
    });

    // Detailed Pipeline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Detailed Application Protocol', 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
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
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `KRISIS Job Intelligence Pipeline v3.0 - Page ${i} of ${pageCount}`,
            105,
            285,
            { align: 'center' }
        );
    }

    // Save with precise nomenclature
    const fileName = `KRISIS_Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

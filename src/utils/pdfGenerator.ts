import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Game } from '../types';

export const generatePDF = async (game: Game) => {
    // We need to capture the ScoreSheet state. 
    // Since we can't easily capture the React component from outside without rendering it,
    // we will assume the User clicks the button ON the ScoreSheet which is rendered.
    // We will target the "root" of the ScoreSheet or a specific ID.

    // However, the ScoreSheet has tabs and scrollbars. 
    // For a "Paper" export, we ideally want to render the FULL table (no scroll) for BOTH teams.

    // Strategy: 
    // 1. Create a "Print View" container off-screen or temporarily visible.
    // 2. Render both team tables there.
    // 3. Capture.

    // Since we are inside the browser, we can just grab the current view for now (MVP).
    // But the current view has scrollbars and only one team.
    // The user requirement is "Upload Score Sheet PDF".

    // Better approach for MVP: Capture what is visible? No, that misses columns.
    // We should clone the DOM node, style it to be full width/height, append to body, capture, then remove.

    // BUT, we have React state managed.
    // We can't easily clone the "logic".

    // Easier approach: Tell the user "Please set up the view and print" OR rely on `window.print()` styles?
    // `window.print()` is actually very powerful if we use `@media print`.
    // We can hide the header/buttons and show BOTH teams in `@media print`.

    // Let's try `window.print()` approach first as it is native and simple?
    // But the user asked for "Google Drive upload". `window.print()` saves to local PDF usually.
    // The user wants "Upload". So we need a Blob.

    // So `html2canvas` is needed.
    // To avoid complex off-screen rendering of React components, 
    // we might stick to capturing the "Current Active View" but fully expanded?

    // We target the hidden PrintableScoreSheet component which has the exact A4 layout
    const element = document.getElementById('pdf-export-container');
    if (!element) {
        alert('印刷用レイアウトが見つかりません');
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Retine quality
            useCORS: true,
            logging: false,
            windowWidth: element.scrollWidth, // Capture full scroll width
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`score_${game.date}_${game.teams.visitor.name}_vs_${game.teams.home.name}.pdf`);

        // In a real app, here we would upload the PDF blob to Google Drive API.
        // Since Google Drive API setup is out of scope (requires OAuth client ID etc.),
        // we will just Save to Device (Download) which the user can then upload.
        // The requirement "Upload to Google Drive" usually implies manual upload or integration.
        // Given the complexity of OAuth, "Download PDF" is the first step.

    } catch (error) {
        console.error('PDF Generation failed', error);
        alert('PDF作成に失敗しました');
    }
};

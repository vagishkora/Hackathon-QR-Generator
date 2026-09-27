// Utility to download ONLY the high-resolution QR code as a PNG
export function downloadQRCodeOnly({ token, participantName, teamName, passId }) {
  const svgElement = document.querySelector('#pass-qr-container svg');
  
  if (!svgElement) {
    alert('QR Code element not found for download.');
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // High-resolution canvas for crisp printing
  const size = 900;
  const padding = 60;
  const footerHeight = 140;
  
  canvas.width = size;
  canvas.height = size + footerHeight;

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    // 1. Fill solid crisp white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw QR code
    const qrSize = size - padding * 2;
    ctx.drawImage(img, padding, padding, qrSize, qrSize);

    // 3. Draw ACM Logo in Center of QR
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
      const logoSize = 160;
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = padding + (qrSize - logoSize) / 2;
      
      // Draw white circular/rounded backing for logo
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, 24);
      ctx.fill();

      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

      // 4. Draw Official ACM & Hackathon Label Footer
      ctx.fillStyle = '#080c14';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HACKDAYS — OFFICIAL LUNCH PASS', canvas.width / 2, size + 20);

      ctx.fillStyle = '#d97706';
      ctx.font = '600 24px Inter, sans-serif';
      ctx.fillText(`${participantName || 'Participant'} • ${teamName || 'NMAMIT'}`, canvas.width / 2, size + 60);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 20px monospace';
      ctx.fillText(`1 OCT 2026 • NMAMIT • ${passId || token?.slice(0, 16) || ''}`, canvas.width / 2, size + 96);

      // 5. Trigger PNG Download
      const safeName = (participantName || 'Pass').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `HACKDAYS_${safeName}_Lunch_QR.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    logoImg.onerror = () => {
      // Fallback if logo fails to load: still download the QR code cleanly
      const safeName = (participantName || 'Pass').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `HACKDAYS_${safeName}_Lunch_QR.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    logoImg.src = '/acm-logo.png';
  };

  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

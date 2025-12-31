
declare const html2canvas: any;

export const exportElementToImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Capture element not found");
    return;
  }

  try {
    // We target the capture area. We ensure background is white for the PNG.
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher scale for better clarity
      logging: false,
      useCORS: true,
      // Ensure we capture the full scrollable content if possible
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Image export failed:", error);
    throw error;
  }
};

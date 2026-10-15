export class Canvas2DRenderer {
    canvas = null;
    ctx = null;

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    draw(frame, width, height) {
        // Simulate object-fit cover
        const aspectRatio = frame.codedWidth / frame.codedHeight;

        // Set canvas size to the client size
        this.canvas.width = width;
        this.canvas.height = height;

        if (width < height * aspectRatio) {
            // Frame is overflowing horizontally
            const targetWidth = height * aspectRatio;
            const positionX = -(targetWidth - width) / 2;
            this.ctx.drawImage(frame, positionX, 0, targetWidth, height);
        } else {
            // Frame is overflowing vertically
            const targetHeight = width / aspectRatio;
            const positionY = -(targetHeight - height) / 2;
            this.ctx.drawImage(frame, 0, positionY, width, targetHeight);
        }
    }
}

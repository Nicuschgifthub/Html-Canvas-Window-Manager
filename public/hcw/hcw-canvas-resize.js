class HCWCanvasResize {
    static resizeCanvas() {
        HCW.canvas.width = window.innerWidth;
        HCW.canvas.height = window.innerHeight;

        HCWRender.updateFrame();
    }
    static setupListener() {
        window.addEventListener("resize", this.resizeCanvas);
        this.resizeCanvas();
    }
}
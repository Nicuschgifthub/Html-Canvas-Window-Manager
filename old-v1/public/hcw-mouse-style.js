class HCWMouseStyle {
    static default() {
        HCW.canvas.style.cursor = "auto";
    }

    static drag() {
        HCW.canvas.style.cursor = "move";
    }

    static move() {
        HCW.canvas.style.cursor = "nwse-resize";
    }

    static moveX() {
        HCW.canvas.style.cursor = "ew-resize";
    }

    static moveY() {
        HCW.canvas.style.cursor = "ns-resize";
    }
}
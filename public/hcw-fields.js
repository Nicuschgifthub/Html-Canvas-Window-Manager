class HCWTextField {
    constructor(text = '', id = Date.now()) {
        this.type = 'text';
        this.text = text;

        this.renderProps = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null
        }
    }

    getType() {
        return this.type;
    }

    setText(text) {
        this.text = text;
    }

    _interaction(interaction) {
        switch (interaction.type) {
            case 'click':
                this.onClick(interaction);
                break;
            case 'hover':
                this.onHover(interaction);
                break;

            default:
                break;
        }
    }

    onClick() { }
    onHover() { }

    render(contextwindow) {

    }
}

class HCWFaderField {
    constructor(faderText = 'Fader 01', id = Date.now()) {
        this.type = 'fader';
        this.text = faderText;

        this.renderProps = {
            colors: {
                background: '#1b1717ff',
                fader: '#574b4bff'
            },
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            sx: null,
            sy: null
        }

        this.values = {

        }
    }

    onValueChange(newFunction) {
        newFunction(this.values);
        return this;
    }


    render(contextwindow) {

    }
}
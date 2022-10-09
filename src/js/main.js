let windows = []
let id = 1;

const createDiv = (cls = "") => {
    let el = document.createElement("div");
    if (cls) el.classList.add(cls);
    return el;
}

const Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class NavBarItem{
    constructor(el) {
        this.bind = el;
        this.el = document.createElement("button");
        this.el.classList.add("window-nav");
        this.el.innerText = el.innerText;
        this.el.addEventListener("click", () => {
            this.bind.zIndex.toTop();
        });
        document.body.querySelector('aside .items').append(this.el);
        Sleep(1)
            .then(async () => {
                this.el.classList.add('shown');
                await NavBarItem.checkAside();
            })
    }

    static disableAll() {
        document.querySelectorAll(".window-nav").forEach(el => {
            el.classList.remove("active");
        });
    }

    static scrollToActive(){
        let active = document.querySelector(".window-nav.active");
        if (active) {
            active.scrollIntoView({behavior: "smooth", block: "center"});
        }
    }

    setActive() {
        NavBarItem.disableAll();
        this.el.classList.add("active");
        NavBarItem.scrollToActive();
    }

    static async checkAside(){
        await Sleep(1);
        let aside = document.body.querySelector('aside');
        let items = [...aside.querySelectorAll('.items > *.shown')]
        if (items.length > 1) {
            aside.classList.remove("hidden");
        } else {
            aside.classList.add("hidden");
        }
    }

    async destroy() {
        this.el.classList.remove('shown');

        await Sleep(200);
        this.el.remove();
        await NavBarItem.checkAside();
    }

    setTitle(title) {
        this.el.innerText = title.toLowerCase().replace('window ', 'w');
    }
}
class zIndexDependecy {
    static reversedStack = [];
    #onRefresh = () => {
    }

    constructor(el) {
        this.el = el;
        this.stack.push(el);
        this.triggerRefresh();
    }

    get stack() {
        return zIndexDependecy.reversedStack;
    }

    set stack(stack) {
        zIndexDependecy.reversedStack = stack;
    }

    get value() {
        return (this.stack.findIndex(el => el === this.el) + 5) * 2
    }

    toTop(force = false) {
        if (!force && this.stack[this.stack.length - 1] === this.el) return this;

        this.stack = [
            ...this.stack.filter(el => el !== this.el),
            this.el
        ];

        zIndexDependecy.refresh();
        this.el.navbarItem.setActive();
        return this;
    }

    static autofocus(){
        let items = zIndexDependecy.reversedStack;
        let count = items.length;
        if(!count) return;
        let el = items[count-1]
        el.zIndex.toTop(true);
    }

    static refresh() {
        let stack = zIndexDependecy.reversedStack;

        if(stack.length) {
            Array.from(document.querySelectorAll('.window.top'))
                .forEach(el => el.classList.remove('top'));

            stack[stack.length - 1].el.classList.add('top');
        }

        zIndexDependecy.reversedStack.forEach(el => el.zIndex.triggerRefresh());
    }

    onRefresh(func) {
        this.#onRefresh = func;
        return this;
    }

    triggerRefresh() {
        this.#onRefresh();
        return this;
    }
}

const randomColor = () => {
    let r = Math.floor(Math.random() * 255);
    let g = Math.floor(Math.random() * 255);
    let b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
}
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getTextColor = (rgb_string) => {
    let rgb = rgb_string.match(/\d+/g);
    let r = parseInt(rgb[0]);
    let g = parseInt(rgb[1]);
    let b = parseInt(rgb[2]);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? "#000" : "#fff";

}

class DraggableWindow {
    constructor(id) {
        this.id = id;

        this.navbarItem = new NavBarItem(this, `...`);

        this.zIndex = (new zIndexDependecy(this))
            .onRefresh(this.render.bind(this))

        this.x = 0;
        this.y = 0;
        this.constraints = {
            minWidth: 193,
            maxWidth: 500,

            minHeight: 146,
            maxHeight: 300
        }

        this.width = this.constraints.minWidth;
        this.height = this.constraints.minHeight;

        // drag
        this.startX = 0;
        this.startY = 0;

        this.draggable = false;
        this.resizable = false;
        this.resizeDirection = null;
        this.freeze = {};

        (() => { // create window
            this.el = createDiv("window");
            this.el.style.backgroundColor = randomColor();
            this.el.style.color = getTextColor(this.el.style.backgroundColor);
            this.el.style.left = this.x + 'px';
            this.el.style.top = this.y + 'px';
        })();

        this.el.append((() => { // create borders
            let borders = createDiv("window-borders");
            borders.append(createDiv("b-top"));
            borders.append(createDiv("b-right"));
            borders.append(createDiv("b-bottom"));
            borders.append(createDiv("b-left"));
            borders.append(createDiv("b-top-left"));
            borders.append(createDiv("b-top-right"));
            borders.append(createDiv("b-bottom-left"));
            borders.append(createDiv("b-bottom-right"));
            return borders;
        })());

        (async () => { // set handlers
            this.content = createDiv("window-content");
            this.el.append(this.content);
            this.el.addEventListener('dblclick', this.onDblClick.bind(this));
            this.el.addEventListener('contextmenu', this.onContextMenu.bind(this));

            this.el.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));

            // this.el.addEventListener('touchstart', this.onMouseDown.bind(this));
            // window.addEventListener('touchmove', this.onMouseMove.bind(this));
            // window.addEventListener('touchend', this.onMouseUp.bind(this));
            // window.addEventListener('touchcancel', this.onMouseUp.bind(this));


            window.addEventListener('blur', this.onMouseUp.bind(this));
            window.document.body.append(this.el);
            await Sleep(1);
            this.el.classList.add('visible');
        })();
        this.setRandomSize();
        this.moveToRandomPlace()
        this.zIndex.toTop(true);
        this.render();
    }

    moveToRandomPlace() {
        // to be on screen and not overlap
        this.x = Math.floor(Math.random() * (window.innerWidth - this.width - 100)) + 50;
        this.y = Math.floor(Math.random() * (window.innerHeight - this.height - 100)) + 50;
        this.render()
    }

    setRandomSize() {
        this.width = randomInt(this.constraints.minWidth, this.constraints.maxWidth);
        this.height = randomInt(this.constraints.minHeight, this.constraints.maxHeight);
        this.render()
    }

    setTitle(text) {
        this.navbarItem.setTitle(text);
        this.content.innerText = text;
    }

    onMouseDown(e) {
        if (e.metaKey || e.ctrlKey)
            return this.destroy();

        this.zIndex.toTop();
        const border = 10;

        if (e.offsetX > border && e.offsetX < this.width - border && e.offsetY > border && e.offsetY < this.height - border) {
            // drag
            this.draggable = true
            this.startX = e.offsetX;
            this.startY = e.offsetY;

            this.el.classList.add('dragging');
            document.querySelector('html').style.setProperty('cursor', 'move', 'important');
        } else {
            this.resizeDirection = [];
            let validClass = [...e.target.classList]
                .filter(e => e.startsWith('b-'))
                .map(e => e.replace('b-', '').split('-'));

            this.resizeDirection = validClass.length ? validClass[0] : [];

            // set global cursor based on direction left, bottom, right, top
            if (validClass.length) {
                let mapping = {
                    'top': 'ns-resize',
                    'bottom': 'ns-resize',
                    'left': 'ew-resize',
                    'right': 'ew-resize',
                    'top-left': 'nwse-resize',
                    'top-right': 'nesw-resize',
                    'bottom-left': 'nesw-resize',
                    'bottom-right': 'nwse-resize',
                }

                let val = mapping[validClass[0].join('-')] || null;

                document.querySelector('html').style.setProperty('cursor', val, 'important');
            }

            this.freeze = {
                x: {
                    flag: false,
                    should_be: '', // '<' or '>'
                    than: 0
                },
                y: {
                    flag: false,
                    should_be: '', // '<' or '>'
                    than: 0
                },

                set(axis, should_be, than) {
                    if (!['<', '>'].includes(should_be)) throw new Error('should_be must be < or >');
                    if (!['x', 'y'].includes(axis)) throw new Error('axis must be x or y');

                    this[axis].flag = true;
                    this[axis].should_be = should_be;
                    this[axis].than = than;
                },

                check(axis, value) {
                    if (!['x', 'y'].includes(axis)) throw new Error('axis must be x or y');
                    if (!this[axis].flag) return true;
                    if (this[axis].should_be === '<') return value < this[axis].than;
                    if (this[axis].should_be === '>') return value > this[axis].than;
                },

                locked(axis) {
                    if (!['x', 'y'].includes(axis)) throw new Error('axis must be x or y');
                    return this[axis].flag;
                },

                lock(axis) {
                    if (!['x', 'y'].includes(axis)) throw new Error('axis must be x or y');
                    this[axis].flag = true;
                },

                unlock(axis) {
                    if (!['x', 'y'].includes(axis)) throw new Error('axis must be x or y');
                    this[axis].flag = false;
                }
            }

            this.resizable = !!this.resizeDirection.length;
            this.el.classList.add('resizing');
        }
    }

    onMouseMove(e)  {
        if (this.draggable) {
            let diffX = e.clientX - this.startX;
            let diffY = e.clientY - this.startY;

            if (diffX < 0) diffX = 0;
            if (diffY < 0) diffY = 0;
            if (diffX + this.width > window.innerWidth) diffX = window.innerWidth - this.width;
            if (diffY + this.height > window.innerHeight) diffY = window.innerHeight - this.height;

            this.x = diffX;
            this.y = diffY;

            this.render();
        }

        if (this.resizable) {
            let {left, top, height, width} = this.el.getBoundingClientRect();
            let fromLeft = left;
            let fromTop = top;
            let fromRight = left + width;
            let fromBottom = top + height;

            let skipX = this.freeze.locked('x') && !this.freeze.check('x', e.clientX);
            let skipY = this.freeze.locked('y') && !this.freeze.check('y', e.clientY);


            if (this.resizeDirection.includes('right') && !skipX) {
                if (this.width + e.movementX < this.constraints.minWidth) {
                    // < min width
                    this.freeze.set('x', '>', fromRight - 5);
                    return;
                } else if (this.width + e.movementX > this.constraints.maxWidth) {
                    // > max width
                    this.freeze.set('x', '<', fromRight - 5);
                    return;
                } else if (fromRight + e.movementX > window.innerWidth) {
                    this.freeze.set('x', '<', window.innerWidth - 5);
                    return;
                }


                this.width += e.movementX;
            } else if (this.resizeDirection.includes('left') && !skipX) {
                if (this.width - e.movementX < this.constraints.minWidth) {
                    // < min width
                    this.freeze.set('x', '<', fromLeft + 5);
                    return;
                } else if (this.width - e.movementX > this.constraints.maxWidth) {
                    // > max width
                    this.freeze.set('x', '>', fromLeft + 5);
                    return;
                } else if (fromLeft + e.movementX < 0) {
                    this.freeze.set('x', '>', 5);
                    return;
                }

                this.width -= e.movementX;
                this.x += e.movementX;
            }

            if (this.resizeDirection.includes('bottom') && !skipY) {

                if (this.height + e.movementY < this.constraints.minHeight) {
                    // < min height
                    this.freeze.set('y', '>', fromBottom - 5);
                    return;
                } else if (this.height + e.movementY > this.constraints.maxHeight) {
                    // > max height
                    this.freeze.set('y', '<', fromBottom - 5);
                    return;
                } else if (fromBottom + e.movementY > window.innerHeight) {
                    this.freeze.set('y', '<', window.innerHeight - 5);
                    return;
                }

                this.height += e.movementY;
            } else if (this.resizeDirection.includes('top') && !skipY) {

                if (this.height - e.movementY < this.constraints.minHeight) {
                    // < min height
                    this.freeze.set('y', '<', fromTop + 5);
                    return;
                } else if (this.height - e.movementY > this.constraints.maxHeight) {
                    // > max height
                    this.freeze.set('y', '>', fromTop + 5);
                    return;
                } else if (fromTop + e.movementY < 0) {
                    this.freeze.set('y', '>', 5);
                    return;
                }

                this.height -= e.movementY;
                this.y += e.movementY;
            }
            //
            // if (this.resizeDirection.includes('top')) {
            //     top += diffY;
            //     height -= diffY;
            // }else if(this.resizeDirection.includes('bottom')) {
            //     height += diffY;
            //     top = bottom - height;
            // }
            //
            // this.x = left;
            // this.y = top;
            // this.width = width;
            // this.height = height;

            this.render();
        }
    }

    onMouseUp() {
        document.querySelector('html').style.removeProperty('cursor');
        this.el.classList.remove('resizing');
        this.el.classList.remove('dragging');
        this.draggable = false;
        this.resizable = false;
    }

    get size() {
        // by sizes
        if (
            this.width <= this.constraints.minWidth + 20 &&
            this.height <= this.constraints.minHeight + 20
        ) return 'minimized';
        else if (
            this.width >= this.constraints.maxWidth - 20 &&
            this.height >= this.constraints.maxHeight - 20
        ) return 'maximized';
        else return 'normal';
    }

    async onDblClick() {
        await this.toggleSize();
    }

    async toggleSize() {
        let width = this.width;
        let height = this.height;

        // animate
        this.el.style.transition = 'all 0.3s ease-in-out';

        if (this.size === 'maximized') {
            this.width = this.constraints.minWidth;
            this.height = this.constraints.minHeight;
        } else {
            this.width = this.constraints.maxWidth;
            this.height = this.constraints.maxHeight;
        }

        let diff = {
            width: this.width - width,
            height: this.height - height
        }

        this.x -= diff.width / 2;
        this.y -= diff.height / 2;


        this.render();

        await Sleep(300);
        this.el.style.removeProperty('transition');
    }

    async onContextMenu(e) {
        e.preventDefault()
        // destroy
        await this.destroy();
    }

    async destroy() {
        // fade out
        this.el.classList.remove('visible');
        await Sleep(300);

        // remove listeners
        this.el.removeEventListener('mousedown', this.onMouseDown.bind(this));
        this.el.removeEventListener('dblclick', this.onDblClick.bind(this));
        this.el.removeEventListener('contextmenu', this.onContextMenu.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        window.removeEventListener('mouseup', this.onMouseUp.bind(this));
        window.removeEventListener('blur', this.onMouseUp.bind(this));

        // remove element
        this.el.remove();

        await this.navbarItem.destroy();

        // remove from stack
        this.zIndex.stack = this.zIndex.stack.filter(el => el !== this);

        // refresh stack
        zIndexDependecy.refresh();

        // remove from windows
        windows = windows.filter(el => el !== this);
        zIndexDependecy.autofocus();

    }


    render() {
        this.el.style.left = this.x + 'px';
        this.el.style.top = this.y + 'px';
        this.el.style.width = this.width + 'px';
        this.el.style.height = this.height + 'px';
        this.el.style.zIndex = this.zIndex.value;
    }
}

const createNewWindow = () => {
    let w = new DraggableWindow();
    w.setTitle('Window ' + (id++));
    windows.push(w)
}

window.addEventListener('load', () => {
    NavBarItem.checkAside();
})

// create new
window.addEventListener('keydown', (e) => {
    if (!(
        (e.ctrlKey && e.code === 'KeyN')
    )) return;
    e.preventDefault();
    createNewWindow();
});

// CTRL + W - close single
// CTRL + SHIFT + W - close all
window.addEventListener('keydown', async (e) => {
    if (!(
        (e.ctrlKey && e.code === 'KeyW')
    )) return;

    e.preventDefault();

    if (windows.length === 0) return;

    if(e.shiftKey){
        id = 1;
        await Promise.all(windows.map(w => w.destroy()));
    }else{
        await windows
            .sort((a, b) => b.zIndex.value - a.zIndex.value)
            .slice(0, 1)
            .pop()
            .destroy();
    }


})

document.querySelector('.add-window').addEventListener('click', () => {
    createNewWindow();
})

document.querySelector('aside >.add-button').addEventListener('click', () => {
    createNewWindow();
})
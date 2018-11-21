import bind from 'bind-decorator';

export class Parser {

    private cursor = 0;
    private parseOrder: string[];
    private message: Buffer;

    constructor(order: string[], initialCursor = 0) {
        this.parseOrder = order;
        this.cursor = initialCursor;
    }

    @bind
    private parseSubTemplate(subTemplate: SubTemplate) {
        const { template, order } = subTemplate;
        const subParser = new Parser(order, this.cursor);
        const result = subParser.parse(template, this.message);
        this.cursor += subParser.currentCursor;
        return result;
    }

    private parseProps(parser: TemplateProp) {
        if (Array.isArray(parser)) {
            return parser.map(this.parseSubTemplate);
        }
        if (typeof parser === 'function') {
            const { value, offset } = parser(this.message, this.cursor);
            this.cursor += offset;
            return value;
        }
        return this.parseSubTemplate(parser);
    }

    public parse(template: Template, message: Buffer) {
        const result: ParseOutput = {};
        this.reset(message);
        this.parseOrder.forEach((key) => {
            result[key] = this.parseProps(template[key]);
        });
        return result;
    }

    public get currentCursor() {
        return this.cursor;
    }

    private reset(newMessage: Buffer) {
        this.cursor = 0;
        this.message = newMessage;
    }
}
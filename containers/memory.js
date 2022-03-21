class ContainerMemory {
    constructor() {
        this.products = []
        this.id = 0
    }

    listAll() {
        return [...this.products]
    }

    save(product) {
        const newproduct = { ...product, id: ++this.id }
        this.products.push(newproduct)
        return newproduct
    }
}

module.exports = ContainerMemory

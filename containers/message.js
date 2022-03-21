const { promises: fs } = require('fs')

class ContainerMessage {

    constructor(ruta) {
        this.ruta = ruta;
    }

    async listAll() {
        try {
            const objs = await fs.readFile(this.ruta, 'utf-8')
            return JSON.parse(objs)
        } catch (error) {
            return []
        }
    }

    async save(obj) {
        const objs = await this.listAll()

        let newId
        if (objs.length == 0) {
            newId = 1
        } else {
            newId = objs[objs.length - 1].id + 1
        }

        const newObj = { ...obj, id: newId }
        objs.push(newObj)

        try {
            await fs.writeFile(this.ruta, JSON.stringify(objs, null, 2))
            return newId
        } catch (error) {
            throw new Error(`Error al guardar: ${error}`)
        }
    }
}

module.exports = ContainerMessage
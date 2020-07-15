const queries = require('./queries')

module.exports = app => {
    const { existOrError, validId } = app.api.validation

    const save = (req, res) => {
        const article = {...req.body}
        if (req.params.id) article.id = req.params.id

        try {
            existOrError(article.name,"Nome do artigo não informado")
            existOrError(article.description, "Descrição não informado")
            existOrError(article.categoryId, "Categoria não informado")
            existOrError(article.userId, "Autor não informado")
            existOrError(article.content, "Sem conteúdo")
        } catch (msg) {
            return res.status(400).send(msg)
        }

        if (article.id) {
            app.db('articles')
                .update(article)
                .where({ id: article.id })
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err))
        } else {
            app.db('articles')
                .insert(article)
                .then(_ => res.status(201).send())
                .catch(err => res.status(500).send(err))
        }
    }

    const remove = async (req, res) => {
        try {
            validId(req.params.id, "ID invalido")
            const rowsDeleted = await app.db('articles')
                .where({ id: req.params.id })
                .del()

            try {
                existOrError(rowsDeleted, 'Artigo não encontrado')
            } catch (msg) {
                return res.status(400).send(msg)
            }

            res.status(204).send()
        } catch (msg) {
            return res.status(500).send(msg)
        }
    }

    const limit = 3

    const get = async (req, res) => {
        const page = req.query.page || 1

        const result = await app.db('articles')
            .count('id')
            .first()

        const count = parseInt(result.count)

        app.db('articles')
            .select('id', 'name', 'description')
            .limit(limit).offset(page * limit - limit)
            .then(articles => res.json({ data: articles, count, limit }))
            .catch(err => res.status(500).send(err))
    }

    const getById = async (req, res) => {
        try {
            validId(req.params.id, "ID invalido")

            const existId = await app.db('articles')
                .where({ id: req.params.id })
                .first()

            existOrError(existId, "Artigo inexistente")
        } catch (msg) {
            return res.status(400).send(msg)
        }
        await app.db('articles')
            .where({ id: req.params.id })
            .first()
            .then(article => {
                article.content = article.content.toString()

                return res.json(article)
            })
            .catch(err => res.status(500).send(err))
    }

    const getByCategory = async (req,res) =>{
        const categoryId = req.params.id
        const page = req.query.page || 1
        const categories = await app.db.raw(queries.categoryWithChildren, categoryId)
        const ids = categories.rows.map(c=>c.id)

        app.db({a:'articles',u:'users'})
            .select('a.id','a.name','a.description','a.imageUrl',{author:'u.name'})
            .limit(limit).offset(page*limit-limit)
            .whereRaw('??=??', ['u.id','a.userId'])
            .whereIn('categoryId', ids)
            .orderBy('a.id','desc')
            .then(articles=> res.json(articles))
            .catch(err=>res.status(500).send(err))
    }

    return { save, remove, get, getById, getByCategory}
}
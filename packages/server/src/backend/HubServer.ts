import {accumulate, Entry, future, Future, Hub, Schema} from '@alinea/core'
import {Functions, Store} from 'helder.store'
import {Drafts} from './Drafts'
import {Index} from './Index'
import {Target} from './Target'

export class HubServer implements Hub {
  constructor(
    public schema: Schema,
    protected store: Store,
    protected drafts: Drafts,
    protected target: Target
  ) {}

  async entry(
    id: string,
    stateVector?: Uint8Array
  ): Future<Entry.WithParents | null> {
    const {schema, store, drafts} = this
    function parents(entry: Entry): Array<string> {
      if (!entry.$parent) return []
      const parent = store.first(Entry.where(Entry.id.is(entry.$parent)))
      return parent ? [parent.id, ...parents(parent)] : []
    }
    return future(
      queryWithDrafts(schema, store, drafts, () => {
        const entry = store.first(Entry.where(Entry.id.is(id)))
        return (
          entry && {
            entry,
            parents: parents(entry)
          }
        )
      })
    )
  }

  async list(parentId?: string): Future<Array<Entry.AsListItem>> {
    const {schema, store, drafts} = this
    const Parent = Entry.as('Parent')
    return future(
      queryWithDrafts(schema, store, drafts, () => {
        return store.all(
          Entry.where(
            parentId ? Entry.$parent.is(parentId) : Entry.$parent.isNull()
          ).select({
            id: Entry.id,
            type: Entry.type,
            title: Entry.title,
            url: Entry.url,
            $parent: Entry.$parent,
            $isContainer: Entry.$isContainer,
            childrenCount: Parent.where(Parent.$parent.is(Entry.id))
              .select(Functions.count())
              .first()
          })
        )
      })
    )
  }

  updateDraft(id: string, update: Uint8Array): Future<void> {
    return future(this.drafts.update(id, update))
  }

  deleteDraft(id: string): Future<void> {
    return future(this.drafts.delete(id))
  }

  publishEntries(entries: Array<Entry>): Future<void> {
    return future(this.target.publish(entries))
  }
}

async function queryWithDrafts<T>(
  schema: Schema,
  store: Store,
  drafts: Drafts,
  run: () => T
): Promise<T> {
  const updates = await accumulate(drafts.updates())
  let result: T | undefined
  try {
    return store.transaction(() => {
      Index.applyUpdates(store, schema, updates)
      result = run()
      throw 'rollback'
    })
  } catch (e) {
    if (e === 'rollback') return result!
    console.log(e)
    throw e
  }
}

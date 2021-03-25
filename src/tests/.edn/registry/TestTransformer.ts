import { Transformer, DB } from '../../../host'
import { TestSource } from './TestSource'
import { TestDestination } from './TestDestination'

export class TestTransformer implements Transformer {
  private _club: string

  constructor(club: string) {
    this._club = club
  }

  async transform(source: DB, destination: TestDestination): Promise<number> {
    const filters = { club: this._club }
    const args = { klass: TestSource, filters, limit: 100 }

    let data = await source.read(args)

    // Add a custom attribute to the data we loaded from the DB
    data = data.map((item) => {
      item.fullName = `${item.firstName} ${item.lastName}`
      return item
    })

    await destination.write(data)

    return data.length
  }
}

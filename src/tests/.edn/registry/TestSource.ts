import { Source } from '../../../host'

export type Output = {
  firstName: string
  lastName: string
  age: number
  hobbies: string[]
  skills: { [key: string]: number }
  club: string
  isActive: boolean
}

export class TestSource implements Source {
  private _club: string
  private _isActive: boolean

  constructor(club: string, isActive: boolean) {
    this._club = club
    this._isActive = isActive
  }

  getOutputExample(): Output {
    return {
      firstName: 'John',
      lastName: 'Doe',
      age: 42,
      hobbies: ['Computer Science', 'Programming', 'Mathematics'],
      skills: { rust: 10, cpp: 10, java: 8 },
      club: 'Programming 101',
      isActive: true
    }
  }

  async read(): Promise<Output[]> {
    return [
      {
        firstName: 'John',
        lastName: 'Doe',
        age: 42,
        hobbies: ['Computer Science', 'Programming', 'Mathematics'],
        skills: { rust: 10, cpp: 10, java: 8 },
        club: this._club,
        isActive: this._isActive
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        age: 24,
        hobbies: ['Tokenomics', 'Distributed Ledgers', 'Cryptocurrencies'],
        skills: { blockchain: 8, dlts: 9, solidity: 10 },
        club: this._club,
        isActive: this._isActive
      }
    ]
  }
}

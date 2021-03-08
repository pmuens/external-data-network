const { log } = console

export function sum(a: number, b: number): number {
  return a + b
}

function main() {
  const result = sum(2, 4)
  log(`2 + 4 = ${result}`)
}

main()

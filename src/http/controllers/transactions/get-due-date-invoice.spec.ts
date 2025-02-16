import { describe, it, expect } from 'vitest'
import { getDueDateInvoice } from './create-credit-expense'

describe('Unit test for getDueDateInvoice for credit transactions', () => {
  it('should be able to return due date of the current invoice if purchase date is before closing date ', () => {
    const purchaseDate = new Date(2025, 1, 10)
    const closingDay = 15
    const dueDay = 20

    const result = getDueDateInvoice(purchaseDate, closingDay, dueDay)

    expect(result.toLocaleDateString()).toEqual('20/02/2025')
  })
  it('should be able to return the due date of the next invoice if the purchase date is after closing date.', () => {
    const purchaseDate = new Date(2025, 1, 16)
    const closingDay = 15
    const dueDay = 20

    const result = getDueDateInvoice(purchaseDate, closingDay, dueDay)

    expect(result.toLocaleDateString()).toEqual('20/03/2025')
  })
  it('should be able to hanle the turn of the year correctly', () => {
    const purchaseDate = new Date(2024, 11, 20)
    const closingDay = 15
    const dueDay = 20

    const result = getDueDateInvoice(purchaseDate, closingDay, dueDay)
    expect(result.toLocaleDateString()).toBe('20/01/2025')
  })

  it('should be able to include the purchase on current invoice if purchase date is on the closing date', () => {
    const purchaseDate = new Date(2025, 1, 15)
    const closingDay = 15
    const dueDay = 20

    const result = getDueDateInvoice(purchaseDate, closingDay, dueDay)
    expect(result.toLocaleDateString()).toBe('20/02/2025')
  })
})

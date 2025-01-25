import { type PriceData } from '@/lib/api'

export interface PortfolioDataPoint {
  date: string
  btcValue: number
  usdValue: number
}

export interface VirtualWallet {
  id: string
  type: 'virtual'
  createdAt: string
  principal: number
  principalCurrency: 'BTC' | 'USD'
  amortizationRate: number
  termMonths: number
}

export interface RealWallet {
  id: string
  type: 'real'
  publicKey: string
}

export type Wallet = VirtualWallet | RealWallet

export function calculatePortfolioValue(
  wallets: Wallet[],
  priceData: PriceData[]
): PortfolioDataPoint[] {
  if (!priceData.length) return []

  return priceData.map((pricePoint) => {
    const date = new Date(pricePoint.date)
    let totalBtc = 0

    for (const wallet of wallets) {
      if (wallet.type === 'virtual') {
        const walletStartDate = new Date(wallet.createdAt)

        if (date < walletStartDate) continue

        const monthsSinceStart =
          (date.getFullYear() - walletStartDate.getFullYear()) * 12 +
          (date.getMonth() - walletStartDate.getMonth())

        const principalBtc =
          wallet.principalCurrency === 'USD'
            ? wallet.principal / priceData[0].price
            : wallet.principal

        const monthlyRate = wallet.amortizationRate / 12
        const monthlyPayment =
          (principalBtc *
            (monthlyRate * Math.pow(1 + monthlyRate, wallet.termMonths))) /
          (Math.pow(1 + monthlyRate, wallet.termMonths) - 1)

        const remainingBalance =
          monthsSinceStart >= wallet.termMonths
            ? 0
            : principalBtc - monthlyPayment * monthsSinceStart

        totalBtc += Math.max(0, remainingBalance)
      }

      if (wallet.type === 'real') {
        totalBtc += 1.0
      }
    }

    return {
      date: pricePoint.date,
      btcValue: totalBtc,
      usdValue: totalBtc * pricePoint.price,
    }
  })
}

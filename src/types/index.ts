// Tipos para las diferentes capas de Bitcoin L2
export type L2Network = "lightning" | "stacks" | "rsk" | "liquid"

// Categorías de aplicaciones
export type AppCategory = 
  | "defi" 
  | "nft" 
  | "dao" 
  | "payments" 
  | "games" 
  | "social" 
  | "tools" 
  | "infrastructure"

// Estado del financiamiento
export type FundingStatus = 
  | "draft" 
  | "review" 
  | "approved" 
  | "active" 
  | "completed" 
  | "cancelled"

// Interfaz principal para aplicaciones
export interface App {
  id: string
  name: string
  description: string
  longDescription?: string
  logo?: string
  website?: string
  github?: string
  category: AppCategory
  l2Networks: L2Network[]
  tags: string[]
  isVerified: boolean
  isFeatured: boolean
  metrics: AppMetrics
  createdAt: Date
  updatedAt: Date
}

export interface AppMetrics {
  users: number
  transactions: number
  volume: number
  rating: number
  reviews: number
}

// Interfaces para el sistema de financiamiento
export interface FundingProposal {
  id: string
  title: string
  description: string
  requestedAmount: number
  currency: string
  milestones: Milestone[]
  status: FundingStatus
  submittedBy: string
  submittedAt: Date
  approvedAt?: Date
  totalFunding: number
  currentMilestone: number
}

export interface Milestone {
  id: string
  title: string
  description: string
  amount: number
  dueDate: Date
  status: "pending" | "in_progress" | "completed" | "failed"
  deliverables: string[]
  completedAt?: Date
}

// Interfaces para usuarios y wallets
export interface User {
  id: string
  address?: string
  email?: string
  name?: string
  avatar?: string
  role: "user" | "developer" | "admin"
  wallets: Wallet[]
  createdAt: Date
}

export interface Wallet {
  id: string
  type: L2Network
  address: string
  isConnected: boolean
  lastUsed: Date
}

// Interfaces para votación y gobernanza
export interface Vote {
  id: string
  proposalId: string
  userId: string
  weight: number
  choice: "approve" | "reject"
  reason?: string
  createdAt: Date
}

// Configuración de L2 Networks
export interface L2Config {
  name: string
  network: L2Network
  displayName: string
  icon: string
  color: string
  rpcUrl?: string
  explorerUrl?: string
  walletIntegrations: string[]
}

export const L2_NETWORKS = {
  LIGHTNING: {
    name: "Lightning Network",
    key: "lightning",
    displayName: "Lightning",
    icon: "⚡",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    description: "Instant Bitcoin payments",
    rpcUrl: process.env.LIGHTNING_NODE_URL,
    explorerUrl: "https://1ml.com",
    walletIntegrations: ["lnurl-auth", "webln", "ln-address"]
  },
  STACKS: {
    name: "Stacks",
    key: "stacks",
    displayName: "Stacks",
    icon: "🔗",
    color: "bg-purple-500",
    textColor: "text-purple-600", 
    description: "Smart contracts on Bitcoin",
    rpcUrl: process.env.STACKS_API_URL || "https://api.stacks.co",
    explorerUrl: "https://explorer.stacks.co",
    walletIntegrations: ["stacks-connect", "xverse", "hiro"]
  },
  RSK: {
    name: "Rootstock",
    key: "rsk",
    displayName: "RSK",
    icon: "🔷",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    description: "EVM-compatible sidechain", 
    rpcUrl: process.env.RSK_RPC_URL || "https://public-node.rsk.co",
    explorerUrl: "https://explorer.rsk.co",
    walletIntegrations: ["metamask", "defiant", "liquality"]
  },
  LIQUID: {
    name: "Liquid",
    key: "liquid", 
    displayName: "Liquid",
    icon: "💧",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    description: "Confidential transactions",
    rpcUrl: process.env.LIQUID_RPC_URL,
    explorerUrl: "https://liquid.network",
    walletIntegrations: ["marina", "green"]
  }
} as const

export const APP_CATEGORIES = {
  DEFI: {
    key: "defi",
    name: "DeFi",
    description: "Finanzas descentralizadas",
    icon: "💰"
  },
  NFT: {
    key: "nft", 
    name: "NFTs",
    description: "Tokens no fungibles",
    icon: "🎨"
  },
  DAO: {
    key: "dao",
    name: "DAOs", 
    description: "Organizaciones autónomas",
    icon: "🏛️"
  },
  PAYMENTS: {
    key: "payments",
    name: "Pagos",
    description: "Sistemas de pago",
    icon: "💳"
  },
  GAMES: {
    key: "games",
    name: "Juegos",
    description: "Gaming y entretenimiento", 
    icon: "🎮"
  },
  SOCIAL: {
    key: "social",
    name: "Social",
    description: "Redes sociales", 
    icon: "👥"
  },
  TOOLS: {
    key: "tools",
    name: "Herramientas",
    description: "Utilidades y herramientas",
    icon: "🔧"
  },
  INFRASTRUCTURE: {
    key: "infrastructure",
    name: "Infraestructura", 
    description: "Servicios de infraestructura",
    icon: "⚙️"
  }
} as const

export const FUNDING_STATUS = {
  DRAFT: {
    key: "draft",
    name: "Borrador",
    color: "bg-gray-500",
    description: "En preparación"
  },
  REVIEW: {
    key: "review", 
    name: "En Revisión",
    color: "bg-yellow-500",
    description: "Siendo evaluado"
  },
  APPROVED: {
    key: "approved",
    name: "Aprobado", 
    color: "bg-green-500",
    description: "Listo para financiar"
  },
  ACTIVE: {
    key: "active",
    name: "Activo",
    color: "bg-blue-500", 
    description: "En desarrollo"
  },
  COMPLETED: {
    key: "completed",
    name: "Completado",
    color: "bg-purple-500",
    description: "Finalizado exitosamente"
  },
  CANCELLED: {
    key: "cancelled", 
    name: "Cancelado",
    color: "bg-red-500",
    description: "Proyecto cancelado"
  }
} as const

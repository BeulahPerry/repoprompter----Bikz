import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Tree } from 'react-arborist'
import { useRepoContext } from '../hooks/useRepoContext'
import { calculateFolderTokens, formatTokenCount } from '../../common/tokenUtils'

interface TreeNode {
  id: string
  name: string
  isFolder: boolean
  children?: TreeNode[]
  path: string
}

function buildArboristTree(files: string[], baseDir: string): TreeNode[] {
  if (!files.length) return []

  const projectName = baseDir.split('/').pop() || 'Project'
  
  // Create a simple flat-to-tree converter
  const createNode = (path: string, name: string, isFolder: boolean): TreeNode => ({
    id: path,
    name: name,
    path: path,
    isFolder: isFolder,
    children: isFolder ? [] : undefined
  })

  // Build tree structure
  const nodeMap = new Map<string, TreeNode>()
  const rootChildren: TreeNode[] = []

  // First pass: create all nodes
  for (const file of files) {
    const parts = file.split('/').filter(part => part.length > 0)
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const previousPath = currentPath
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isFolder = i < parts.length - 1
      
      if (!nodeMap.has(currentPath)) {
        const node = createNode(currentPath, part, isFolder)
        nodeMap.set(currentPath, node)
        
        if (previousPath) {
          // Add to parent
          const parent = nodeMap.get(previousPath)
          if (parent && parent.children) {
            parent.children.push(node)
          }
        } else {
          // Top level node
          rootChildren.push(node)
        }
      }
    }
  }

  // Sort children alphabetically (folders first, then files)
  const sortNodes = (nodes: TreeNode[]) => {
    return nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
  }

  // Sort all children recursively
  nodeMap.forEach(node => {
    if (node.children) {
      node.children = sortNodes(node.children)
    }
  })

  const sortedRootChildren = sortNodes(rootChildren)

  // Return with root wrapper
  return [{
    id: '__ROOT__',
    name: projectName,
    path: '__ROOT__',
    isFolder: true,
    children: sortedRootChildren
  }]
}

function getFileIcon(name: string | undefined, isFolder: boolean, isOpen?: boolean) {
  if (!name) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  
  if (isFolder) {
    if (name === '__ROOT__' || name.includes('Project')) {
      // Project root icon
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
        </svg>
      )
    }
    // Regular folder icon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={isOpen ? "text-yellow-600" : "text-yellow-500"}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
      </svg>
    )
  }

  const ext = name.split('.').pop()?.toLowerCase() || ''
  
  // TypeScript files
  if (ext === 'ts' || ext === 'tsx') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
        <text x="12" y="16" textAnchor="middle" className="fill-white text-xs font-bold">TS</text>
      </svg>
    )
  }
  
  // JavaScript files
  if (ext === 'js' || ext === 'jsx') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
        <text x="12" y="16" textAnchor="middle" className="fill-black text-xs font-bold">JS</text>
      </svg>
    )
  }
  
  // React files
  if (ext === 'jsx' || ext === 'tsx') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-500">
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
        <path d="M12 1a15.3 15.3 0 0 1 4 0 15.3 15.3 0 0 1 4 0" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M12 23a15.3 15.3 0 0 1-4 0 15.3 15.3 0 0 1-4 0" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M20 5.5a15.3 15.3 0 0 1-4 3.5 15.3 15.3 0 0 1-4 3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M4 18.5a15.3 15.3 0 0 1 4-3.5 15.3 15.3 0 0 1 4-3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    )
  }
  
  // JSON files
  if (ext === 'json') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="12" y="16" textAnchor="middle" className="fill-current text-xs font-bold">{}</text>
      </svg>
    )
  }
  
  // Markdown files
  if (ext === 'md' || ext === 'markdown') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-700 dark:text-white">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="12" y="16" textAnchor="middle" className="fill-current text-xs font-bold">M</text>
      </svg>
    )
  }
  
  // CSS files
  if (ext === 'css' || ext === 'scss' || ext === 'sass') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-pink-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    )
  }
  
  // HTML files
  if (ext === 'html' || ext === 'htm') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    )
  }
  
  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-500">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    )
  }
  
  // Default file icon
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  )
}

interface FileListFilters {
  minTokens: number
  maxTokens?: number
  text: string
  hideBinary: boolean
  hideLocks: boolean
  hideArtifacts: boolean
}

interface FileListProps {
  isTreeCollapsed?: boolean
  tokenBudget?: number
  sortMode?: 'path' | 'tokensDesc' | 'tokensAsc' | 'recent'
  filters?: FileListFilters
}

export function FileList({ isTreeCollapsed = false, tokenBudget = 200_000, sortMode = 'path', filters }: FileListProps) {
  const { baseDir, fileList, selectedFiles, toggleSelectedFile, fileTokens, totalSelectedTokens, updateFileTokens } = useRepoContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<any>(null)
  const [containerHeight, setContainerHeight] = useState(400)

  // Simple classifiers
  const isLockFile = (p: string) => /(^|\/)((package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Pipfile\.lock|Cargo\.lock|Gemfile\.lock|composer\.lock|Podfile\.lock))$/i.test(p)
  const isArtifactPath = (p: string) => /(^|\/)(dist|build|\.build|node_modules|out)(\/|$)/i.test(p) || /\.map$|\.min\.js$/i.test(p)
  const isBinaryLike = (p: string) => /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|gz|tar|tgz|7z|exe|dll|so|a|bin|class|o|obj|wasm)$/i.test(p)

  const passesFilters = (p: string, tokens: number | undefined) => {
    if (filters) {
      const { minTokens, maxTokens, text, hideBinary, hideLocks, hideArtifacts } = filters
      if (hideBinary && isBinaryLike(p)) return false
      if (hideLocks && isLockFile(p)) return false
      if (hideArtifacts && isArtifactPath(p)) return false
      if (text && !p.toLowerCase().includes(text.toLowerCase())) return false
      if (typeof minTokens === 'number') {
        if ((tokens ?? 0) < minTokens) return false
      }
      if (typeof maxTokens === 'number') {
        if ((tokens ?? 0) > maxTokens) return false
      }
    }
    return true
  }

  const filteredFiles = useMemo(() => {
    if (!fileList.length) return [] as string[]
    return fileList.filter(p => {
      if (p === '__ROOT__' || p.endsWith('/')) return false
      const t = fileTokens[p]
      return passesFilters(p, t)
    })
  }, [fileList, fileTokens, filters])

  const treeData = useMemo(() => {
    if (!filteredFiles.length || !baseDir) return []
    return buildArboristTree(filteredFiles, baseDir)
  }, [filteredFiles, baseDir])

  // Sorting by tokens or path
  useEffect(() => {
    if (!treeData.length) return
    const tokenOf = (n: TreeNode): number => {
      if (!n) return 0
      if (!n.isFolder) return fileTokens[n.path] || 0
      return calculateFolderTokens(n, fileTokens)
    }
    const sortNodes = (nodes?: TreeNode[]) => {
      if (!nodes) return
      nodes.sort((a, b) => {
        if (sortMode === 'path' || sortMode === 'recent') {
          // TODO: recent fallback to path until mtimes available
          if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
          return a.name.localeCompare(b.name)
        }
        const at = tokenOf(a)
        const bt = tokenOf(b)
        const dir = sortMode === 'tokensDesc' ? -1 : 1
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        if (at === bt) return a.name.localeCompare(b.name)
        return at < bt ? dir : -dir
      })
      nodes.forEach(ch => sortNodes(ch.children))
    }
    const root = treeData[0]
    sortNodes(root?.children)
    // We intentionally do not set state; react-arborist reads our data array by reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData, fileTokens, sortMode])

  // Estimate width needed to avoid cutting off long nested names
  const estimatedWidth = useMemo(() => {
    const INDENT = 14 // keep in sync with Tree indent
    const ICONS_AND_CONTROLS = 64 // arrow + checkbox + icon + paddings

    const compute = (nodes: TreeNode[] | undefined, depth: number): number => {
      if (!nodes) return 0
      let maxPx = 0
      for (const n of nodes) {
        const nameLen = (n.name || '').length
        // Approximate character width in px (monospace-ish feel)
        const namePx = nameLen * 8
        const rowPx = depth * INDENT + ICONS_AND_CONTROLS + namePx
        if (rowPx > maxPx) maxPx = rowPx
        if (n.children && n.children.length) {
          maxPx = Math.max(maxPx, compute(n.children, depth + 1))
        }
      }
      return maxPx
    }

    try {
      const root = treeData[0]
      const innerWidth = compute(root?.children, 1)
      // Minimum sensible width
      return Math.max(360, innerWidth)
    } catch {
      return 360
    }
  }, [treeData])

  const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles])

  // Calculate container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerHeight(rect.height || 400)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Handle collapse/expand when isTreeCollapsed changes
  useEffect(() => {
    if (!treeRef.current || !treeData.length) return

    const tree = treeRef.current
    
    // Wait for tree to be fully initialized
    setTimeout(() => {
      if (isTreeCollapsed) {
        // Close all folders except root
        tree.closeAll()
        // Keep root open
        tree.open('__ROOT__')
      } else {
        // Open all folders recursively
        const openAll = (nodes?: TreeNode[]) => {
          if (!nodes) return
          for (const n of nodes) {
            if (n.isFolder) {
              tree.open(n.id)
              openAll(n.children)
            }
          }
        }
        tree.open('__ROOT__')
        const rootNode = treeData[0]
        openAll(rootNode?.children)
      }
    }, 50)
  }, [isTreeCollapsed, treeData])

  // Background token precomputation for all files (lazy, batched)
  useEffect(() => {
    if (!baseDir || !fileList.length) return

    let cancelled = false
    const BATCH = 75

    const run = async () => {
      try {
        // Only compute for files missing tokens (skip folders)
        const missing: string[] = []
        for (const f of fileList) {
          // Skip root marker and any directory-like paths (convention: end with '/')
          if (f === '__ROOT__' || f.endsWith('/')) continue
          if (!fileTokens[f]) missing.push(f)
        }
        if (missing.length === 0) return

        for (let i = 0; i < missing.length && !cancelled; i += BATCH) {
          const batch = missing.slice(i, i + BATCH)
          const { contents } = await window.api.readMultipleFileContents(baseDir, batch)
          if (cancelled) break
          for (const [filePath, content] of Object.entries(contents)) {
            if (
              content &&
              !content.startsWith('// File too large') &&
              !content.startsWith('// Error reading file')
            ) {
              updateFileTokens(filePath, content)
            }
          }
          // Yield to UI
          if (i + BATCH < missing.length) {
            await new Promise(r => setTimeout(r, 40))
          }
        }
      } catch (e) {
        console.error('Background token precompute failed:', e)
      }
    }

    // kick off after a short delay to avoid blocking initial render
    const t = setTimeout(run, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [baseDir, fileList, fileTokens, updateFileTokens])

  const handleSelect = (nodes: TreeNode[]) => {
    // Handle selection changes
    const newSelection = nodes.map(n => n.path).filter(path => path !== '__ROOT__')
    
    // Find files to add and remove
    const toAdd = newSelection.filter(path => !selectedFiles.includes(path))
    const toRemove = selectedFiles.filter(path => !newSelection.includes(path))
    
    // Apply changes
    toAdd.forEach(path => toggleSelectedFile(path))
    toRemove.forEach(path => toggleSelectedFile(path))
  }

  const isSelected = (node: TreeNode) => {
    if (node.path === '__ROOT__') {
      // Root is selected if all files and folders are selected
      const gatherAllPaths = (n: TreeNode): string[] => {
        const paths: string[] = []
        if (n.path !== '__ROOT__') {
          paths.push(n.path)
        }
        if (n.children) {
          n.children.forEach(child => {
            paths.push(...gatherAllPaths(child))
          })
        }
        return paths
      }
      
      const allPaths = gatherAllPaths(node)
      return allPaths.length > 0 && allPaths.every(path => selectedFiles.includes(path))
    }
    
    // For folders, check if the folder itself is selected OR if all its contents are selected
    if (node.isFolder) {
      // First check if the folder itself is explicitly selected
      if (selectedSet.has(node.path)) {
        return true
      }
      
      // If not explicitly selected, check if all contents are selected
      const gatherFiles = (n: TreeNode): string[] => {
        if (!n.isFolder) return [n.path]
        if (!n.children) return []
        return n.children.flatMap(gatherFiles)
      }
      
      const allFiles = gatherFiles(node)
      return allFiles.length > 0 && allFiles.every(file => selectedFiles.includes(file))
    }
    
    // For files, just check direct selection
    return selectedSet.has(node.path)
  }

  const Node = ({ node, style, dragHandle }: any) => {
    if (!node) return null
    
    // React-arborist wraps our data - access the actual data
    const nodeData = node.data || node
    
    const selected = isSelected(nodeData)
    const icon = getFileIcon(nodeData.name, nodeData.isFolder, node.isOpen)
    
    // Token display (always visible) based on budget percent
    const fileTokensCount = !nodeData.isFolder ? (fileTokens[nodeData.path] || 0) : 0
    const folderTokensCount = nodeData.isFolder ? calculateFolderTokens(nodeData, fileTokens) : 0
    const tokensCount = nodeData.isFolder ? folderTokensCount : fileTokensCount
    const pct = tokenBudget > 0 ? (tokensCount / tokenBudget) * 100 : 0
    const pctText = `${pct.toFixed(1)}%`
    const colorClass = pct > 5 ? 'text-red-500' : pct >= 1 ? 'text-amber-500' : 'text-green-500'
    
    const handleClick = () => {
      if (nodeData.isFolder) {
        if (nodeData.path === '__ROOT__') {
          // Special handling for root - select/unselect ALL items (files + directories)
          const gatherAllPaths = (n: TreeNode): string[] => {
            const paths: string[] = []
            if (n.path !== '__ROOT__') {
              paths.push(n.path) // Include both files and folders
            }
            if (n.children) {
              n.children.forEach(child => {
                paths.push(...gatherAllPaths(child))
              })
            }
            return paths
          }
          
          const allPaths = gatherAllPaths(nodeData)
          const allSelected = allPaths.every(path => selectedFiles.includes(path))
          
          if (allSelected) {
            // Unselect all
            allPaths.forEach(path => {
              if (selectedFiles.includes(path)) {
                toggleSelectedFile(path)
              }
            })
          } else {
            // Select all
            allPaths.forEach(path => {
              if (!selectedFiles.includes(path)) {
                toggleSelectedFile(path)
              }
            })
          }
        } else {
          // For regular folders, gather all descendant files AND include the folder itself
          const gatherFiles = (n: TreeNode): string[] => {
            if (!n.isFolder) return [n.path]
            if (!n.children) return []
            return n.children.flatMap(gatherFiles)
          }
          
          const allFiles = gatherFiles(nodeData)
          const allPaths = [nodeData.path, ...allFiles] // Include the folder itself
          const allSelected = allPaths.every(path => selectedFiles.includes(path))
          
          if (allSelected) {
            // Unselect all (folder and its files)
            allPaths.forEach(path => {
              if (selectedFiles.includes(path)) {
                toggleSelectedFile(path)
              }
            })
          } else {
            // Select all (folder and its files)
            allPaths.forEach(path => {
              if (!selectedFiles.includes(path)) {
                toggleSelectedFile(path)
              }
            })
          }
        }
      } else {
        // Single file
        toggleSelectedFile(nodeData.path)
      }
    }

    return (
      <div
        ref={dragHandle}
        style={style}
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-[13px] transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-inset ${
          selected ? 'bg-blue-50 dark:bg-blue-900/30 font-medium' : ''
        }`}
        role="treeitem"
        tabIndex={0}
        aria-selected={selected}
        aria-expanded={nodeData.isFolder ? node.isOpen : undefined}
        aria-label={`${nodeData.isFolder ? 'Folder' : 'File'}: ${nodeData.name}${selected ? ' (selected)' : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          } else if (e.key === 'ArrowRight' && nodeData.isFolder && !node.isOpen) {
            e.preventDefault()
            node.toggle()
          } else if (e.key === 'ArrowLeft' && nodeData.isFolder && node.isOpen) {
            e.preventDefault()
            node.toggle()
          }
        }}
      >
        {/* Expand/collapse arrow for folders */}
        {nodeData.isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              node.toggle()
            }}
            className="w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
            aria-label={`${node.isOpen ? 'Collapse' : 'Expand'} folder ${nodeData.name}`}
            aria-expanded={node.isOpen}
          >
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="none"
              className={`transform transition-transform duration-150 ${node.isOpen ? 'rotate-90' : ''}`}
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="w-5 h-5 mr-1" />
        )}
        
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          onClick={handleClick}
          className="mr-1.5 w-3.5 h-3.5 rounded border-2 border-gray-300 dark:border-gray-600 cursor-pointer accent-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          aria-label={`${selected ? 'Unselect' : 'Select'} ${nodeData.isFolder ? 'folder' : 'file'} ${nodeData.name}`}
        />
        <div className="mr-1.5 flex-shrink-0">{icon}</div>
        <span 
          className="whitespace-nowrap text-gray-800 dark:text-gray-200 text-[13px] cursor-pointer flex-1 font-medium tracking-normal"
          onClick={handleClick}
        >
          {nodeData.name || 'Unknown'}
        </span>
        
        {/* Token chip (always visible) */}
        <span
          className={`text-xs ml-2 font-mono ${colorClass}`}
          title={`${tokensCount} tokens • ${pctText} of budget`}
        >
          ({formatTokenCount(tokensCount)} ⏺ {pctText})
        </span>
      </div>
    )
  }

  if (!baseDir || fileList.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-3 text-gray-400 dark:text-gray-500"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No repository selected</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Click "Open Repo" to get started</p>
        </div>
      </div>
    )
  }

  const tokenDisplayHeight = selectedFiles.length > 0 ? 18 : 0

  return (
    <div className="flex-1 flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <Tree
          ref={treeRef}
          data={treeData}
          openByDefault={true}
          width={Math.max(containerRef.current?.clientWidth || 360, estimatedWidth)}
          height={Math.max(containerHeight - tokenDisplayHeight, 220)} // Ensure minimum height
          indent={14}
          rowHeight={26}
          overscanCount={20}
          disableDrop
          disableDrag
          disableMultiSelection={true}
          padding={0}
        >
          {Node}
        </Tree>
      </div>
      
      {/* Total token display */}
      {selectedFiles.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-mono font-medium">
            Total: {formatTokenCount(totalSelectedTokens)} tokens ({selectedFiles.length} files)
          </span>
        </div>
      )}
    </div>
  )
}
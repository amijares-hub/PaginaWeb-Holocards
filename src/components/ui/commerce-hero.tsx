"use client";

import { ArrowUpRight, Menu, Search, ShoppingBasket } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Button } from "./button";
import { Separator } from "./separator";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const categories = [
  {
    title: "Home",
    image: "/Imagenes/ME03_ES_104.png",
    href: "#",
  },
  {
    title: "Cards",
    image: "/Imagenes/ME03_ES_111.png",
    href: "#",
  },
  {
    title: "Tech",
    image: "/Imagenes/ME03_ES_12.png",
    href: "#",
  },
  {
    title: "Merch",
    image: "/Imagenes/ME03_ES_123.png",
    href: "#",
  },
];

const navigation = [
  { name: "Home", href: "/" },
  { name: "Inventory", href: "/admin/inventory" },
  { name: "Orders", href: "/admin/orders" },
  { name: "Blog", href: "#" },
];

export function CommerceHero() {
  return (
    <div className="w-full relative container px-2 mx-auto max-w-7xl min-h-screen">

        <div className="mt-6 bg-zinc-900/30 rounded-2xl relative border border-white/5">
          <header className="flex items-center">
            <div className="w-full md:w-2/3 lg:w-1/2 bg-[#09090b]/95 backdrop-blur-sm p-4 rounded-br-2xl flex items-center gap-2 border-r border-b border-white/5">
              <a href="#" className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                Sasori_Labs
              </a>

              <nav className="hidden lg:flex items-center justify-between w-full ml-8">
                {navigation.map((item) => (
                  <Button 
                    key={item.name} 
                    variant="link" 
                    className="cursor-pointer relative group hover:text-red-500 transition-colors no-underline text-zinc-400"
                  >
                    {item.name}
                  </Button>
                ))}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="cursor-pointer relative group hover:text-red-500 transition-colors text-zinc-400">
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="cursor-pointer relative group hover:text-red-500 transition-colors text-zinc-400">
                    <ShoppingBasket className="w-5 h-5" />
                  </Button>
                </div>
              </nav>

              <Sheet>
                <SheetTrigger asChild className="lg:hidden ml-auto">
                  <Button variant="ghost" size="icon" className="hover:text-red-500 transition-colors">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[300px] sm:w-[400px] p-0 bg-[#09090b] backdrop-blur-md border-r border-white/5"
                >
                  <SheetHeader className="p-6 text-left border-b border-white/5">
                    <SheetTitle className="flex items-center justify-between">
                      <a href="#" className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent italic">
                        Sasori_Labs
                      </a>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col p-6 space-y-1">
                    {navigation.map((item) => (
                      <Button 
                        key={item.name}
                        variant="ghost" 
                        className="justify-start px-2 h-12 text-base font-medium hover:bg-white/5 hover:text-red-500 transition-colors text-zinc-300"
                      >
                        {item.name}
                      </Button>
                    ))}
                  </nav>
                  <Separator className="mx-6 bg-white/5" />
                  <div className="p-6 flex flex-col gap-4">
                    <Button variant="outline" className="justify-start gap-2 h-12 hover:bg-white/5 border-white/5 transition-colors">
                      <Search className="w-4 h-4" />
                      Search Catalog
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-12 hover:bg-white/5 border-white/5 transition-colors relative">
                      <ShoppingBasket className="w-4 h-4" />
                      Cart System
                      <span className="absolute right-3 w-5 h-5 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center">
                        3
                      </span>
                    </Button>
                  </div>
                  <Separator className="mx-6 bg-white/5" />
                  <div className="p-6">
                    <Button className="w-full h-12 bg-red-600 hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20">
                      Access Terminal
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden md:flex w-1/2 justify-end items-center pr-4 gap-4 ml-auto">
              <Button
                variant="secondary"
                className="cursor-pointer bg-red-600 p-0 rounded-full shadow-lg hover:shadow-red-600/30 transition-all duration-300 group hover:bg-red-700"
              >
                <span className="pl-6 py-2 text-sm font-bold text-white italic tracking-tighter">ESTABLISH_SESSION</span>
                <div className="rounded-full flex items-center justify-center m-auto bg-black w-10 h-10 ml-2 group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                </div>
              </Button>
            </div>
          </header>

          <motion.section
            className="w-full px-4 py-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mx-auto text-center">
              <motion.h1
                className="text-4xl md:text-5xl lg:text-8xl font-black italic tracking-tighter mb-6 leading-[0.9]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              >
                <span className="bg-gradient-to-r from-red-600 via-red-500 to-white bg-clip-text text-transparent">
                  SUPPLY_LEVEL_UP
                </span>
                <br />
                <span className="text-white">
                  ULTIMATE_COLLECTOR.
                </span>
              </motion.h1>
              <motion.p
                className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed uppercase tracking-widest font-mono text-[10px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              >
                High-end sourcing for legendary Pokémon assets. 
                <span className="text-red-500 block">SASORILABS.IO // v2.4.0</span>
              </motion.p>
              <motion.div 
                className="mt-10 flex flex-wrap justify-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button className="bg-white text-black font-bold h-12 px-8 rounded-xl hover:bg-zinc-200">
                  EXPLORE CATALOG
                </Button>
                <Button variant="outline" className="border-white/10 text-white font-bold h-12 px-8 rounded-xl hover:bg-white/5">
                  VIEW COLLECTIONS
                </Button>
              </motion.div>
            </div>
          </motion.section>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto mt-12 pb-20">
          {categories.map((category, index) => (
            <motion.div
              key={category.title}
              className="group relative bg-zinc-900/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 min-h-[250px] sm:min-h-[300px] w-full overflow-hidden transition-all duration-500 border border-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
            >
              <a href={category.href} className="absolute inset-0 z-20">
                <h2 className="text-center text-2xl sm:text-3xl md:text-4xl lg:text-[clamp(1.5rem,4vw,2.5rem)] font-black italic relative z-10 text-white my-2 sm:my-4 group-hover:text-red-500 transition-colors duration-300 tracking-tighter uppercase">
                  {category.title}
                </h2>
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full max-w-[min(40vw,200px)] h-auto object-contain opacity-50 group-hover:scale-110 group-hover:opacity-90 transition-all duration-500 grayscale group-hover:grayscale-0"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-black/95 backdrop-blur-sm rounded-tl-3xl flex items-center justify-center z-10 border-l border-t border-white/5">
                  <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 w-10 h-10 md:w-12 md:h-12 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-lg">
                    <ArrowUpRight className="w-5 h-5 text-red-500 group-hover:text-white" />
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
    </div>
  );
}

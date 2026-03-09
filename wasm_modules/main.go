package main

import (
	"bytes"
	"fmt"
	"syscall/js"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/rwcarlsen/goexif/exif"
)

func hashFileBytes(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return "error: missing byte array argument"
	}
	jsArray := args[0]
	length := jsArray.Get("byteLength").Int()
	byteSlice := make([]byte, length)
	
	// Copy JS Uint8Array to Go []byte
	js.CopyBytesToGo(byteSlice, jsArray)

	h := xxhash.New()
	h.Write(byteSlice)
	return fmt.Sprintf("%x", h.Sum(nil))
}

func getExifDateBytes(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return ""
	}
	jsArray := args[0]
	length := jsArray.Get("byteLength").Int()
	byteSlice := make([]byte, length)
	js.CopyBytesToGo(byteSlice, jsArray)

	reader := bytes.NewReader(byteSlice)
	x, err := exif.Decode(reader)
	if err != nil {
		return ""
	}

	tm, err := x.DateTime()
	if err != nil {
		return ""
	}

	return tm.Format(time.RFC3339)
}

func main() {
	// Channel to keep the WASM instance running
	c := make(chan struct{}, 0)
	js.Global().Set("hashFileBytes", js.FuncOf(hashFileBytes))
	js.Global().Set("getExifDateBytes", js.FuncOf(getExifDateBytes))
	fmt.Println("Antigravity WASM bridge loaded (xxhash, exif)")
	<-c
}

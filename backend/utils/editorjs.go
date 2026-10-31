package utils

import (
	"bytes"
	"encoding/json"
	"log"

	editorjs "github.com/si3nloong/go-editorjs"
)

// JsonMarshal marshals the given interface into JSON bytes
func JsonMarshal(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// EditorJSToHTML converts EditorJS JSON data to HTML
func EditorJSToHTML(content []byte) (string, error) {
	ejs := editorjs.NewEditorJS()
	buf := new(bytes.Buffer)

	if err := ejs.ParseTo(content, buf); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// ConvertBlockContentToHTML takes the content of a block and converts it to HTML if it's in EditorJS format
func ConvertBlockContentToHTML(content []byte) (string, error) {
	// Check if this is EditorJS format by looking for required fields
	var data map[string]interface{}
	err := json.Unmarshal(content, &data)
	if err != nil {
		return "", err
	}

	// Check if it has EditorJS structure (time, blocks, version)
	_, hasTime := data["time"]
	blocks, hasBlocks := data["blocks"]
	_, hasVersion := data["version"]

	// If it's not in EditorJS format, return empty string
	if !hasTime || !hasBlocks || !hasVersion {
		// Not in EditorJS format, return empty
		return "", nil
	}

	// Validate that blocks is an array
	_, isArray := blocks.([]interface{})
	if !isArray {
		return "", nil
	}

	// Convert to HTML
	return EditorJSToHTML(content)
}

// IsEditorJSFormat checks if content is in EditorJS format
func IsEditorJSFormat(content []byte) bool {
	var data map[string]interface{}
	err := json.Unmarshal(content, &data)
	if err != nil {
		return false
	}

	// Check for required EditorJS fields
	_, hasTime := data["time"]
	blocks, hasBlocks := data["blocks"]
	_, hasVersion := data["version"]

	if !hasTime || !hasBlocks || !hasVersion {
		return false
	}

	// Validate that blocks is an array
	_, isArray := blocks.([]interface{})
	return isArray
}

// CreateEmptyEditorJSContent creates an empty EditorJS content structure
func CreateEmptyEditorJSContent() []byte {
	emptyContent := map[string]interface{}{
		"time":    json.Number("0"),
		"blocks":  []interface{}{},
		"version": "2.28.0",
	}

	content, err := json.Marshal(emptyContent)
	if err != nil {
		log.Printf("Error creating empty EditorJS content: %v", err)
		return []byte("{}")
	}

	return content
}

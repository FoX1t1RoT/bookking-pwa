#!/usr/bin/env python3
"""
Custom HTTP Server for BookKing PWA with proper MIME types
"""

import http.server
import socketserver
import os
import mimetypes

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Set proper MIME types
        mimetypes.add_type('application/javascript', '.js')
        mimetypes.add_type('text/css', '.css')
        mimetypes.add_type('image/svg+xml', '.svg')
        mimetypes.add_type('application/manifest+json', '.json')
        super().__init__(*args, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for PWA
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def guess_type(self, path):
        """Override to ensure proper MIME types"""
        base, ext = os.path.splitext(path)
        if ext == '.js':
            return 'application/javascript'
        elif ext == '.css':
            return 'text/css'
        elif ext == '.svg':
            return 'image/svg+xml'
        elif ext == '.json':
            return 'application/json'
        elif ext == '.ico':
            return 'image/x-icon'
        else:
            return super().guess_type(path)

def run_server(port=8000):
    """Run the custom HTTP server"""
    with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
        print(f"BookKing PWA Server running on http://localhost:{port}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run_server() 
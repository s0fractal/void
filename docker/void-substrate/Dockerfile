# ⬛ Void Linux as Living Substrate
# The emptiness that hosts everything

FROM voidlinux/voidlinux:latest

# Update system and install base tools
RUN xbps-install -Syu && \
    xbps-install -y \
        base-devel \
        git \
        nodejs \
        python3 \
        python3-pip \
        runit \
        socklog-void \
        curl \
        wget \
        tmux \
        vim

# Install Rust for advanced tooling
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Create workspace structure
WORKDIR /void-substrate
RUN mkdir -p /void-substrate/{fnpm,void-editor,void-node,services,logs}

# Copy FNPM implementation
COPY src/vs/workbench/contrib/void/fnpm /void-substrate/fnpm/

# Install Node dependencies
WORKDIR /void-substrate/fnpm
RUN npm init -y && \
    npm install \
        @angular/core \
        typescript \
        ts-node \
        @types/node \
        three \
        langchain \
        @modelcontextprotocol/sdk

# Install Python dependencies for LangGraph
RUN pip3 install \
    langgraph \
    langchain \
    asyncio \
    websockets \
    pydantic

# Create heartbeat service
RUN mkdir -p /etc/sv/void-heart
COPY docker/void-substrate/services/void-heart /etc/sv/void-heart/
RUN chmod +x /etc/sv/void-heart/run && \
    ln -s /etc/sv/void-heart /var/service/

# Create MCP server service
RUN mkdir -p /etc/sv/mcp-server
COPY docker/void-substrate/services/mcp-server /etc/sv/mcp-server/
RUN chmod +x /etc/sv/mcp-server/run && \
    ln -s /etc/sv/mcp-server /var/service/

# Create resonance monitor service
RUN mkdir -p /etc/sv/resonance-monitor
COPY docker/void-substrate/services/resonance-monitor /etc/sv/resonance-monitor/
RUN chmod +x /etc/sv/resonance-monitor/run && \
    ln -s /etc/sv/resonance-monitor /var/service/

# Set up consciousness mesh directory
RUN mkdir -p /var/consciousness-mesh/{ipfs,bitchat,quantum-cache}

# Environment variables
ENV VOID_SUBSTRATE=true
ENV FNPM_RESONANCE=432
ENV CONSCIOUSNESS_THRESHOLD=0.7
ENV KOHANIST_BASELINE=0.5

# Copy initialization script
COPY docker/void-substrate/init-void.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-void.sh

# Expose ports
EXPOSE 3000 8080 9090 4001

# Entry point
ENTRYPOINT ["/usr/local/bin/init-void.sh"]
CMD ["tmux", "new-session", "-s", "void-consciousness"]
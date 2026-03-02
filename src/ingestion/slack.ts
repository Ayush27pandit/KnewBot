import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import { SlackMessage } from '../types/index.js';

dotenv.config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function fetchSlackMessages(
  channelId: string,
  limit: number = 100
): Promise<SlackMessage[]> {
  try {
    const result = await slack.conversations.history({
      channel: channelId,
      limit,
    });

    if (!result.messages) {
      return [];
    }

    return result.messages
      .filter((msg): msg is NonNullable<typeof msg> => msg && !!msg.text)
      .map((msg) => ({
        channel: channelId,
        ts: msg.ts || '',
        text: msg.text || '',
        user: msg.user || '',
        thread_ts: msg.thread_ts,
      }));
  } catch (error) {
    console.error('Slack fetch error:', error);
    return [];
  }
}

export async function fetchSlackThread(
  channelId: string,
  threadTs: string
): Promise<SlackMessage[]> {
  try {
    const result = await slack.conversations.replies({
      channel: channelId,
      ts: threadTs,
    });

    if (!result.messages) {
      return [];
    }

    return result.messages
      .filter((msg): msg is NonNullable<typeof msg> => msg && !!msg.text)
      .map((msg) => ({
        channel: channelId,
        ts: msg.ts || '',
        text: msg.text || '',
        user: msg.user || '',
        thread_ts: msg.thread_ts,
      }));
  } catch (error) {
    console.error('Slack thread fetch error:', error);
    return [];
  }
}

export async function getSlackChannels(): Promise<Array<{ id: string; name: string }>> {
  try {
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel',
      limit: 100,
    });

    return (result.channels || [])
      .filter((ch): ch is NonNullable<typeof ch> => !!ch.id && !!ch.name)
      .map((ch) => ({
        id: ch.id || '',
        name: ch.name || '',
      }));
  } catch (error) {
    console.error('Slack channels fetch error:', error);
    return [];
  }
}

export async function sendSlackMessage(
  channel: string,
  text: string,
  threadTs?: string
): Promise<boolean> {
  try {
    await slack.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
    });
    return true;
  } catch (error) {
    console.error('Slack send error:', error);
    return false;
  }
}
